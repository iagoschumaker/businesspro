import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

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
    vendas: item.sales || 0,
    pedidos: item.orders || 0
  }));

  return (
    <div className="h-64">
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-10 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
          <p>Sem dados de vendas disponíveis</p>
          <p className="text-sm mt-1">Os dados de vendas aparecerão aqui assim que houver atividade.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
              formatter={(value, name) => {
                if (name === 'vendas') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Vendas'];
                return [value, name === 'pedidos' ? 'Pedidos' : name];
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="vendas" 
              name="Vendas"
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="pedidos" 
              name="Pedidos"
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default SalesChart;