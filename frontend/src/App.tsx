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
    <div className='h-screen w-screen'>
      
      <div>
        
        {/* Graphique CPU */}
        <div>
          <h3>CPU (Temp: Purple | Load: Red %)</h3>
          <div className='w-full h-60'>
            <ResponsiveContainer>
              <AreaChart data={historyCPU}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip  />
                <Area type="monotone" dataKey="temp" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} isAnimationActive={false}/>
                <Area type="monotone" dataKey="load" stroke="#ff4444" fill="#ff4444" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique RAM */}
        <div>
          <h3>RAM (Usage %)</h3>
          <div className='w-full h-60'>
            <ResponsiveContainer>
              <AreaChart data={historyRAM}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip  />
                <Area type="monotone" dataKey="usage" stroke="#00C49F" fill="#00C49F" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Stockage */}
        <div>
          <h3>Stockage (Go Utilisés)</h3>
          <div className='w-full h-60'>
            <ResponsiveContainer>
              <AreaChart data={historyStorage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip  />
                <Area type="monotone" dataKey="used" stroke="#FFBB28" fill="#FFBB28" fillOpacity={0.3} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Watts (Prise Meross) */}
        <div>
          <h3>Consommation (Watts ⚡)</h3>
          <div  className='w-full h-60'>
            <ResponsiveContainer>
              <AreaChart data={historyWatts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
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