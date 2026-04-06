import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import si from 'systeminformation'
import Database from 'better-sqlite3'
import { MerossService } from './meross.js'

const app = new Hono()
const meross = new MerossService()

const db = new Database('data/history.db');
db.pragma('journal_mode = WAL'); // Optimisation pour SQLite

db.exec(`
  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_temp REAL,
    cpu_load REAL,
    ram_used REAL,
    ram_total REAL,
    storage_used REAL, 
    storage_total REAL,
    watts REAL
  )
`);

const MES_PROJETS = [
  { 
    id: 'chambre',
    nom: 'Chambre 3D', 
    url: 'https://chambre.timote.ovh',
    githubRepo: 'chambre-3D' // Pour l'état du déploiement
  },
  { 
    id: 'ent',
    nom: 'Mon ENT', 
    url: 'https://ent.timote.ovh',
    githubRepo: 'ent-frontend'
  },
  { 
    id: 'nextcloud',
    nom: 'Nextcloud', 
    url: 'https://cloud.timote.ovh',
    githubRepo: null // Pas de repo GitHub, c'est juste une image Docker !
  },
  { 
    id: 'notes',
    nom: 'Mes Notes', 
    url: 'https://notes.timote.ovh',
    githubRepo: null // Pas de repo GitHub, c'est juste une image Docker !
  },
  { 
    id: 'quiz',
    nom: 'Quiz entre Potes', 
    url: 'https://quiz.timote.ovh',
    githubRepo: 'Culture-de-geek'
  }
];

interface GithubCommit {
  projet: string;
  message: string;
  auteur: string;
  date: string;
  hash: string;
  url: string;
}

// On précise maintenant le type au moment de la déclaration
let cachedCommits: GithubCommit[] = [];

// Fonction pour récupérer les commits de GitHub
async function fetchLatestCommits() {
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_TOKEN;
  
  if (!username || !token) {
    console.log("⚠️ GITHUB_TOKEN ou GITHUB_USERNAME manquant pour les commits.");
    return;
  }

  try {
    let tousLesCommits = [];

    // On boucle sur tes projets qui ont un repo GitHub
    const reposA_Scraper = MES_PROJETS.filter(p => p.githubRepo);

    for (const projet of reposA_Scraper) {
      const url = `https://api.github.com/repos/${username}/${projet.githubRepo}/commits?per_page=5`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Dashboard-Timote' // GitHub exige un User-Agent
        }
      });

      if (res.ok) {
        const data = await res.json();
        // On formate les données pour ne garder que l'essentiel et alléger la requête
        const commitsFormates = data.map((c: any) => ({
          projet: projet.nom,
          message: c.commit.message.split('\n')[0], //   On garde que la 1ère ligne du message
          auteur: c.commit.author.name,
          date: c.commit.author.date,
          hash: c.sha.substring(0, 7),
          url: c.html_url
        }));
        
        tousLesCommits.push(...commitsFormates);
      }
    }

    // On trie TOUS les commits du plus récent au plus ancien
    tousLesCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // On ne garde que les 20 plus récents
    cachedCommits = tousLesCommits.slice(0, 20);
    console.log('🐙 Cache des commits mis à jour !');

  } catch (error) {
    console.error("Erreur lors de la récupération des commits:", error);
  }
}

// On met à jour le cache toutes les 15 minutes (pour ne pas spammer GitHub)
setInterval(fetchLatestCommits, 15 * 60 * 1000);
// On lance une première récupération au démarrage du serveur
fetchLatestCommits();

app.use('/api/*', cors())

app.get('/api/stats', async (c) => {
  const isLinux = process.platform === 'linux'
  
  let cpuTemp, cpuLoad, ramData, storageData;

  

  if (isLinux) { // UNIQUEMENT SI LE PROGRAME EST SUR LE SERVEUR
    const [temp, load, mem, fs] = await Promise.all([
      si.cpuTemperature(),
      si.currentLoad(),
      si.mem(),
      si.fsSize() 
    ]);
    
    // CPU
    cpuTemp = temp.main || 0; 
    cpuLoad = parseFloat(load.currentLoad.toFixed(2));

    // RAM
    ramData = {
      used: parseFloat((mem.used / 1024 ** 3).toFixed(2)),
      total: parseFloat((mem.total / 1024 ** 3).toFixed(2)),
      percent: parseFloat(((mem.active / mem.total) * 100).toFixed(2))
    };

    //STOCKAGE
    const mainDrive = fs.find(drive => drive.mount === '/') || fs[0];
    if (mainDrive) {
      storageData = {
        used: parseFloat((mainDrive.used / 1024 ** 3).toFixed(2)),
        total: parseFloat((mainDrive.size / 1024 ** 3).toFixed(2)),
        percent: parseFloat(mainDrive.use.toFixed(2)) 
      };

    } else {
      storageData = { used: 0, total: 0, percent: 0 };
    }

    

  } else { // PROGRAMME TESTÉ EN LOCAL
    cpuTemp = Math.floor(Math.random() * (55 - 40 + 1) + 40);
    cpuLoad = Math.floor(Math.random() * 30);
    ramData = { used: 3.4, total: 8, percent: 42.5 };
    storageData = { used: 45, total: 256, percent: 17.5 };
  }

  // WATTS
  const watts = await meross.getPowerUsage();

  // RETURN TOUTES LES DATAS
  return c.json({
    status: 'online',
    cpu: {
      temp: cpuTemp,
      load: cpuLoad,
    },
    ram: ramData,
    storage: storageData,
    watts: watts,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/history', (c) => {
  try {
    // Récupère les 60 dernières minutes (ou plus si tu veux), triées chronologiquement
    const stmt = db.prepare('SELECT * FROM stats ORDER BY timestamp DESC LIMIT 60');
    const history = stmt.all().reverse(); 
    return c.json(history);
  } catch (err) {
    console.error("Erreur lecture BDD:", err);
    return c.json({ error: "Impossible de lire l'historique" }, 500);
  }
});

setInterval(async () => {
  try {
    const isLinux = process.platform === 'linux';
    let cpuTemp = 0, cpuLoad = 0, ramUsed = 0, ramTotal = 0, storageUsed = 0, storageTotal = 0;

    if (isLinux) {
      const [temp, load, mem, fs] = await Promise.all([si.cpuTemperature(), si.currentLoad(), si.mem(), si.fsSize()]);
      cpuTemp = temp.main || 0;
      cpuLoad = parseFloat(load.currentLoad.toFixed(2));
      ramUsed = parseFloat((mem.used / 1024 ** 3).toFixed(2));
      ramTotal = parseFloat((mem.total / 1024 ** 3).toFixed(2));
      const mainDrive = fs.find(drive => drive.mount === '/') || fs[0];
      if (mainDrive) {
        storageUsed = parseFloat((mainDrive.used / 1024 ** 3).toFixed(2));
        storageTotal = parseFloat((mainDrive.size / 1024 ** 3).toFixed(2));
      }
    } else {
      // Fausses données pour tes tests sur Windows
      cpuTemp = Math.random() * (55 - 40) + 40;
      cpuLoad = Math.random() * 30;
      ramUsed = 4;
      ramTotal = 64;
      storageUsed = 45;
    }

    const watts = await meross.getPowerUsage();

    // Insertion sécurisée dans SQLite
    const insert = db.prepare('INSERT INTO stats (cpu_temp, cpu_load, ram_used, ram_total, storage_used, storage_total, watts) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run(cpuTemp, cpuLoad, ramUsed, ramTotal, storageUsed, storageTotal, watts);
    
    console.log('💾 Historique sauvegardé !');
  } catch (err) {
    console.error('Erreur lors de la sauvegarde SQLite:', err);
  }
}, 60000);

let githubState: Record<string, any> = {};

// 2. On la remplit automatiquement au démarrage du serveur
MES_PROJETS.forEach(projet => {
  if (projet.githubRepo) {
    const repoName = projet.githubRepo.toLowerCase();
    
    githubState[repoName] = { 
      status: 'idle', 
      conclusion: null, 
      message: 'Aucun déploiement récent' 
    };
  }
});

// 2. La "boîte aux lettres" secrète pour GitHub (Webhook)
app.post('/api/github-webhook', async (c) => {
  try {
    const data = await c.req.json();

    // On vérifie que c'est bien une notification de "Workflow" (déploiement)
    if (data.workflow_run) {
      const repoName = data.repository.name.toLowerCase(); // ex: "chambre-3d"
      const run = data.workflow_run;

      // On met à jour notre mémoire INSTANTANÉMENT
      githubState[repoName] = {
        status: run.status,           // "queued", "in_progress", ou "completed"
        conclusion: run.conclusion,   // "success", "failure", ou null
        message: run.display_title    // Le nom de ton commit (ex: "Fix bug CSS")
      };
      
      console.log(`🚀 Webhook reçu pour ${repoName}: ${run.status}`);
    }
    
    // On répond 200 OK pour que GitHub sache qu'on a bien reçu le message
    return c.text('OK');
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return c.text('Erreur', 500);
  }
});

// 3. La route toute légère pour ton React
app.get('/api/github-status', (c) => {
  return c.json(githubState);
});

app.get('/api/commits', (c) => {
  return c.json(cachedCommits);
});

app.get('/api/services', async (c) => {
  try {
    const checkPromises = MES_PROJETS.map(async (projet) => {
      let status = 'offline';
      try {
        const res = await fetch(projet.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (res.ok) status = 'online';
      } catch (error) {
        status = 'offline';
      }

      // 👇 ON RENVOIE TOUTES LES INFOS DU PROJET ICI 👇
      return {
        id: projet.id,
        name: projet.nom,
        url: projet.url,
        status: status,
        // On sécurise en mettant le repo en minuscules (comme on a vu tout à l'heure !)
        githubRepo: projet.githubRepo ? projet.githubRepo.toLowerCase() : null 
      };
    });

    const servicesStatus = await Promise.all(checkPromises);
    return c.json(servicesStatus);
  } catch (error) {
    return c.json({ error: "Impossible de lire les services" }, 500);
  }
});

const port = 8085
console.log(`Serveur dashboard lancé sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })