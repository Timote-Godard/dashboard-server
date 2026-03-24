import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div style={{ backgroundColor: '#111', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Server Monitoring - timote.ovh</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Graphique CPU */}
        <div style={{ background: '#222', padding: '15px', borderRadius: '10px' }}>
          <h3>CPU (Temp: Purple | Load: Red %)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={historyCPU}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area type="monotone" dataKey="temp" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} isAnimationActive={false}/>
                <Area type="monotone" dataKey="load" stroke="#ff4444" fill="#ff4444" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique RAM */}
        <div style={{ background: '#222', padding: '15px', borderRadius: '10px' }}>
          <h3>RAM (Usage %)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={historyRAM}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area type="monotone" dataKey="usage" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Stockage */}
        <div style={{ background: '#222', padding: '15px', borderRadius: '10px' }}>
          <h3>Stockage (Go Utilisés)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={historyStorage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area type="monotone" dataKey="used" stroke="#FFBB28" fill="#FFBB28" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Watts (Prise Meross) */}
        <div style={{ background: '#222', padding: '15px', borderRadius: '10px' }}>
          <h3>Consommation (Watts ⚡)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={historyWatts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area type="monotone" dataKey="watts" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;