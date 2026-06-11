import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#8c6239', '#d4af37', '#6b8e23', '#b23b3b', '#a27b5c'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
  if (percent < 0.05) return null; // Ocultar etiquetas muy pequeñas
  
  const radius = outerRadius + 20; // Etiqueta por fuera del donut
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="var(--text-primary)" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={13}
      fontWeight={800}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const AnswerPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="no-data-placeholder">Sin distribución de respuestas disponible</div>;
  }

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={5}
            dataKey="value"
            label={renderCustomizedLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-sans)', marginTop: '10px' }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnswerPieChart;
