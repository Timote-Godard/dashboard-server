import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import si from 'systeminformation'
import Database from 'better-sqlite3'
import { MerossService } from './meross.js'
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

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

app.get('/api/services', async (c) => {
  try {
    // On demande à Docker la liste de TOUS les conteneurs
    const containers = await docker.listContainers({ all: true });

    // On transforme cette donnée brute en belle liste pour ton React
    const services = containers
      .map(container => {
        // Le nom du conteneur commence souvent par un "/", on l'enlève
        const rawName = container.Names[0].replace('/', ''); 
        
        // On nettoie un peu le nom (par exemple "ent-app-1" devient "ent")
        const cleanName = rawName.split('-')[0];

        return {
          name: cleanName.toUpperCase(),
          // On génère le sous-domaine automatiquement !
          url: `https://${cleanName}.timote.ovh`, 
          // Si l'état est "running", c'est vert, sinon c'est rouge
          status: container.State === 'running' ? 'online' : 'offline'
        };
      })
      // On filtre pour ne pas afficher le dashboard lui-même ou les bases de données internes
      .filter(s => 
        !s.name.includes('DASHBOARD') && 
        !s.name.includes('DB') && 
        !s.name.includes('MARIADB')
      );

    // Pour éviter les doublons si tu as plusieurs conteneurs pour un même projet
    const uniqueServices = Array.from(new Map(services.map(item => [item.name, item])).values());

    return c.json(uniqueServices);

  } catch (error) {
    console.error("Erreur de communication avec Docker:", error);
    return c.json({ error: "Impossible de lire les services" }, 500);
  }
});

const port = 8085
console.log(`Serveur dashboard lancé sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })