import { 
  AreaChart, Area, 
  Tooltip,
  YAxis, // On rajoute l'import de l'axe Y
} from 'recharts';

interface MetricConfig {
  key: string;
  color: string;
  label: string;
}

interface StatChartProps {
  title: string;
  data: any[];
  metrics: MetricConfig[];
  yDomain?: [number, number | 'auto']; 
  width?: number;
  height?: number;
}

const StatChart = ({ 
  title, 
  data, 
  metrics, 
  yDomain = [0, 'auto'],
  width = 450, 
  height = 250
}: StatChartProps) => {
  return (
      <div className='w-full h-full flex flex-col items-center justify-center p-2'>
        
        {/* TITRE DU GRAPHIQUE */}
        <h2 className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-2 self-start ml-8 border-b border-cyan-900/50 w-full pb-1">
          {title}
        </h2>

        <AreaChart width={width} height={height} data={data}>
          <defs>
            {metrics.map((m) => (
              <linearGradient key={`grad-${m.key}`} id={`color${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>

          {/* AXE Y OPTIMISÉ POUR LA 3D */}
          <YAxis 
            domain={yDomain} 
            stroke="#334155" // Couleur ardoise discrète
            fontSize={10} 
            tick={{ fill: '#94a3b8' }} // Couleur de texte claire
            tickLine={false}
            axisLine={false}
            width={30} // Largeur fixe pour éviter les décalages
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              border: '1px solid #1e293b', 
              borderRadius: '8px',
              fontSize: '10px'
            }}
            itemStyle={{ fontSize: '10px', color: '#fff' }}
            isAnimationActive={false} 
          />

          {metrics.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              fill={`url(#color${m.key})`} 
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </div>
  );
};

export default StatChart;