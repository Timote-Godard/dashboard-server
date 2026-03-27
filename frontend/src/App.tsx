import { useEffect, useState } from 'react';
import StatChart from "./components/StatChart";



// Interfaces pour le typage des données
interface ChartPointRAM {
  time: string;
  ramUsed: number; 
}

interface ChartPointCPU {
  time: string;
  temp: number;
  load: number;
}

interface ChartPointStorage {
  time: string;
  storageUsed: number;
}

interface ChartPointWatts {
  time: string;
  watts: number;
}

interface EtatService {
  name: string;
  url: string;
  status: string;
}

function App() {
  const [historyCPU, setHistoryCPU] = useState<ChartPointCPU[]>([]);
  const [historyRAM, setHistoryRAM] = useState<ChartPointRAM[]>([]);
  const [historyStorage, setHistoryStorage] = useState<ChartPointStorage[]>([]);
  const [historyWatts, setHistoryWatts] = useState<ChartPointWatts[]>([]);
  const [etatServices, setEtatServices] = useState<EtatService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [githubStatus, setGithubStatus] = useState<any>(null);

  const fetchLiveStats = async () => {
    try {
      const res = await fetch('https://api-dashboard.timote.ovh/api/stats');
      if (!res) {
        console.log('pas bon');
      }
      const data = await res.json();
      const time = new Date().toLocaleTimeString();

      setHistoryCPU(prev => [...prev, { time, temp: data.cpu.temp, load: data.cpu.load }].slice(-61));
      setHistoryRAM(prev => [...prev, { time, ramUsed: data.ram.used }].slice(-61));
      setHistoryStorage(prev => [...prev, { time, storageUsed: data.storage.used }].slice(-61));
      setHistoryWatts(prev => [...prev, { time, watts: data.watts }].slice(-61)); 
      
    } catch (err) {
      console.error("Erreur API :", err);
    }

    try {
      const res = await fetch("https://api-dashboard.timote.ovh/api/services");
      const data = await res.json();
      setEtatServices(data);
    }
    catch (err) {
      console.error("Erreur API :", err);
    }

    try {
      const resGithub = await fetch("https://api-dashboard.timote.ovh/api/github-status");
      const dataGithub = await resGithub.json();
      setGithubStatus(dataGithub);
    } catch (err) {
      console.error("Erreur API GitHub Status :", err);
    }
  };


  const fetchHistory = async () => {
    try {
      // ⚠️ N'oublie pas de mettre l'URL / IP de ton serveur !
      const res = await fetch('https://api-dashboard.timote.ovh/api/history');
      if (!res.ok) return;
      
      const data = await res.json();

      
      
      // On transforme les données brutes de la base de données (SQLite) au format attendu par tes graphiques (Recharts)
      const formatTimestamp = (timestamp: string) => {
        const utcDate = new Date(timestamp.includes('Z') ? timestamp : timestamp + 'Z');
        return utcDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      };

      // 2. On applique la logique à tous tes jeux de données
      const formattedCPU = data.map((d: any) => ({ 
        time: formatTimestamp(d.timestamp),
        temp: d.cpu_temp, 
        load: d.cpu_load 
      }));

      const formattedRAM = data.map((d: any) => ({ 
        time: formatTimestamp(d.timestamp), 
        ramUsed: d.ram_used
      }));

      const formattedStorage = data.map((d: any) => ({ 
        time: formatTimestamp(d.timestamp), 
        storageUsed: d.storage_used 
      }));

      const formattedWatts = data.map((d: any) => ({ 
        time: formatTimestamp(d.timestamp), 
        watts: d.watts 
      }));

      // On injecte d'un coup l'historique dans les graphiques
      setHistoryCPU(formattedCPU);
      setHistoryRAM(formattedRAM);
      setHistoryStorage(formattedStorage);
      setHistoryWatts(formattedWatts);
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const demarrerDashboard = async () => {
      await fetchHistory(); 
      await fetchLiveStats(); 
      
      // 👇 LES DONNÉES SONT LÀ : ON ENLÈVE LE CHARGEMENT 👇
      setIsLoading(false); 

      interval = setInterval(fetchLiveStats, 3000);
    };

    demarrerDashboard();
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold animate-pulse">Initialisation du Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-screen p-8'>
      <h1 className="text-2xl font-bold mb-8">Dashboard Serveur</h1>
      
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

        {githubStatus && githubStatus['chambre-3d'] && (
  <div className="p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
    <h2 className="text-xl font-bold mb-4 text-white">⚙️ Déploiement Chambre-3D</h2>
    
    <div className="flex items-center space-x-4">
      {/* L'icône animée */}
      {(githubStatus['chambre-3d'].status === 'in_progress' || githubStatus['chambre-3d'].status === 'queued') ? (
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      ) : githubStatus['chambre-3d'].conclusion === 'success' ? (
        <div className="w-8 h-8 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] flex items-center justify-center text-white font-bold">✓</div>
      ) : githubStatus['chambre-3d'].conclusion === 'failure' ? (
        <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] flex items-center justify-center text-white font-bold">✗</div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold">-</div>
      )}

      {/* Le texte */}
      <div className="flex flex-col">
        <span className="font-medium text-gray-200">
          {githubStatus['chambre-3d'].message}
        </span>
        <span className="text-xs text-gray-400">
          {githubStatus['chambre-3d'].status === 'in_progress' ? 'Construction en cours...' 
            : githubStatus['chambre-3d'].conclusion === 'success' ? 'En ligne' 
            : githubStatus['chambre-3d'].conclusion === 'failure' ? 'Échec du déploiement'
            : 'En attente'}
        </span>
      </div>
    </div>
  </div>
)}

        
        
        <StatChart 
          title="CPU Performance" 
          data={historyCPU}
          yDomain={[0, 100]} 
          metrics={[
            { key: 'temp', color: '#8884d8', label: 'Température (°C)' },
            { key: 'load', color: '#ff4444', label: 'Charge (%)' }
          ]} 
        />

        <StatChart 
          title="RAM Used" 
          data={historyRAM}
          yDomain={[0, 16]} 
          metrics={[{ key: 'ramUsed', color: '#00C49F', label: 'Utilisation' }]} 
        />

        <StatChart 
          title="Stockage" 
          data={historyStorage}
          yDomain={[0, 100]} 
          metrics={[{ key: 'storageUsed', color: '#FFBB28', label: 'Go Utilisés' }]} 
        />

        <StatChart 
          title="Consommation Électrique" 
          data={historyWatts}
          yDomain={[0, 'auto']}
          metrics={[{ key: 'watts', color: '#0088FE', label: 'Watts' }]} 
        />

        

      </div>

      <div className='flex flex-col gap-4 border-1 border-black w-max p-4 rounded-xl mt-5 '>
          {etatServices.map((valeur,key) => (
            <div key={key} className='flex flex-row gap-3 items-center '> 
              
              {valeur.status === "online" ? <div className='rounded-xl bg-green-300 h-5 w-5'></div> : <div className='rounded-xl bg-red-300 h-5 w-5'></div> }
              {valeur.name}
            </div>
          ))}
        </div>
    </div>
  );
}

export default App;