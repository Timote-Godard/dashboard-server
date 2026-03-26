import { 
  AreaChart, Area, XAxis, YAxis, 
  Tooltip, ResponsiveContainer 
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
}

const StatChart = ({ title, data, metrics, yDomain = [0, 'auto'] }: StatChartProps) => {
  return (
    <div className='p-5 rounded-xl border border-gray-800 transition-all hover:scale-102 hover:shadow-md hover:shadow-gray-300'>
      <div className='flex'>
        <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4 font-bold">{title}</h3>
      </div>
      <div className='w-full h-64'>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              {/* On génère un dégradé par métrique */}
              {metrics.map((m) => (
                <linearGradient key={`grad-${m.key}`} id={`color${m.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>

            <XAxis 
              dataKey="time" 
              stroke="#444" 
              fontSize={10} 
              tickMargin={10}
              axisLine={false}
              tickLine={false}
            />

            <YAxis 
              stroke="#444" 
              fontSize={10} 
              axisLine={false}
              tickLine={false}
              domain={yDomain} 
              tickFormatter={(value) => `${value}`} 
            />

            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />

            {metrics.map((m) => (
              <Area
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                fill={`url(#color${m.key})`} // On appelle l'ID du gradient défini plus haut
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatChart;