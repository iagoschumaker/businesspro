import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface SalesChartProps {
  data: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  // Transformar dados para o formato do gráfico
  const chartData = data.map(item => ({
    name: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    sales: item.sales || 0
  }));

  // Se não há dados, mostrar dados de exemplo
  const defaultData = [
    { name: '1', sales: 4000 },
    { name: '5', sales: 3000 },
    { name: '10', sales: 2000 },
    { name: '15', sales: 2780 },
    { name: '20', sales: 1890 },
    { name: '25', sales: 2390 },
    { name: '30', sales: 3490 },
  ];

  const displayData = chartData.length > 0 ? chartData : defaultData;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            className="text-sm text-gray-600 dark:text-gray-400"
          />
          <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;