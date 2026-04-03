import { 
  AreaChart, Area, XAxis, YAxis, 
  Tooltip 
  // On ne charge plus ResponsiveContainer !
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
  // On ajoute les dimensions en props
  width?: number;
  height?: number;
}

const StatChart = ({ 
  title, 
  data, 
  metrics, 
  yDomain = [0, 'auto'],
  width = 450, // Taille par défaut (un peu plus petit que ton écran de 490)
  height = 250
}: StatChartProps) => {
  return (
      <div className='w-full h-full flex flex-col items-center justify-center'>
        {/* On donne la taille directement au graphique */}
        <AreaChart width={width} height={height} data={data}>
          
          <defs>
            {metrics.map((m) => (
              <linearGradient key={`grad-${m.key}`} id={`color${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>

          {/* Astuce Opti : Désactiver l'animation du Tooltip */}
          <Tooltip 
            contentStyle={{ border: '1px solid #333', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
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
              isAnimationActive={false} // C'est parfait ici !
            />
          ))}
        </AreaChart>
      </div>
  );
};

export default StatChart;