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

function App() {
  const [historyCPU, setHistoryCPU] = useState<ChartPointCPU[]>([]);
  const [historyRAM, setHistoryRAM] = useState<ChartPointRAM[]>([]);
  const [historyStorage, setHistoryStorage] = useState<ChartPointStorage[]>([]);
  const [historyWatts, setHistoryWatts] = useState<ChartPointWatts[]>([]);

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
      setHistoryWatts(prev => [...prev, { time, watts: data.watts }].slice(-61)); // Récupération des Watts !
      
    } catch (err) {
      console.error("Erreur API :", err);
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
    fetchHistory();
    const interval = setInterval(fetchLiveStats, 3000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='min-h-screen w-screen p-8'>
      <h1 className="text-2xl font-bold mb-8">Dashboard Serveur</h1>
      
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        
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
          metrics={[{ key: 'ramUsed', color: '#00C49F', label: 'Utilisation (%)' }]} 
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
          metrics={[{ key: 'watts', color: '#0088FE', label: 'Watts (⚡)' }]} 
        />

      </div>
    </div>
  );
}

export default App;