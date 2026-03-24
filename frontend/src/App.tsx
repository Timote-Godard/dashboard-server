import { useEffect, useState } from 'react';
import { Thermometer, Cpu, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { hsla } from 'framer-motion';

interface DashboardData {
  status: string;
  cpu: {
    temp: number;
    load: number;
  };
  ram: {
    used: number;
    total: number;
    percent: number;
  };
  timestamp: string;
}

interface ChartPointRAM {
  time: string;
  usage: number; 
}

interface ChartPointCPU {
  time: string;
  temp: number;
  load: number;
}

function App() {

  const [stats, setStats] = useState<DashboardData | null>(null);
  const [historyCPU, setHistoryCPU] = useState<ChartPointCPU[]>([]);
  const [historyRAM, setHistoryRAM] = useState<ChartPointRAM[]>([]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8085/api/stats');
      const data = await res.json();
      setStats(data);

      setHistoryCPU(prev => [...prev, { time: new Date().toLocaleTimeString(), temp: data.cpu.temp, load:data.cpu.load }].slice(-20))
      setHistoryRAM(prev => [...prev, { time: new Date().toLocaleTimeString(), usage: data.ram.percent }].slice(-20))
    } catch (err) {
      console.error("L'API est éteinte ?", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart 
            data={historyCPU}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="temp" stroke="#8884d8" fill="#8884d8" isAnimationActive={false}/>
            <Area type="monotone" dataKey="load" stroke="#861b1b" fill="#861b1b" isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart 
            data={historyRAM}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="usage" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="temp" stroke="#8884d8" fill="#8884d8" isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>

    
  )
}

export default App
