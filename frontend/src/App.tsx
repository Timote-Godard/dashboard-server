import { useEffect, useState } from 'react';
import StatChart from "./components/StatChart";

// Interfaces pour le typage des données
interface ChartPointRAM {
  time: string;
  usage: number; 
}

interface ChartPointCPU {
  time: string;
  temp: number;
  load: number;
}

interface ChartPointStorage {
  time: string;
  used: number;
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

  const fetchStats = async () => {
    try {
      const res = await fetch('https://api-dashboard.timote.ovh/api/stats');
      if (!res) {
        console.log('pas bon');
      }
      const data = await res.json();
      const time = new Date().toLocaleTimeString();

      setHistoryCPU(prev => [...prev, { time, temp: data.cpu.temp, load: data.cpu.load }].slice(-20));
      setHistoryRAM(prev => [...prev, { time, usage: data.ram.percent }].slice(-20));
      setHistoryStorage(prev => [...prev, { time, used: data.storage.used }].slice(-20));
      setHistoryWatts(prev => [...prev, { time, watts: data.watts }].slice(-20)); // Récupération des Watts !
      
    } catch (err) {
      console.error("Erreur API :", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); 
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
          title="RAM Usage" 
          data={historyRAM}
          yDomain={[0, 100]} 
          metrics={[{ key: 'usage', color: '#00C49F', label: 'Utilisation (%)' }]} 
        />

        <StatChart 
          title="Stockage" 
          data={historyStorage}
          yDomain={[0, 100]} 
          metrics={[{ key: 'used', color: '#FFBB28', label: 'Go Utilisés' }]} 
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