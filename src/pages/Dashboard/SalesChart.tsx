<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
=======
import React from 'react';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
<<<<<<< HEAD
  ResponsiveContainer
} from 'recharts';
import { formatBRFlexible } from '../../utils/date';
=======
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

interface SalesChartProps {
  data: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
<<<<<<< HEAD
  // Transformar dados para o formato do gráfico (sem mocks)
  const chartData = Array.isArray(data)
    ? data.map(item => ({
        // Use centralized local-time formatter (DD/MM/AAAA). If you prefer DD/MM only, slice off the year.
        name: formatBRFlexible(item.date),
        sales: item.sales || 0,
      }))
    : [];

  // Tema escuro reativo: observa classe 'dark' no html e mudanças de sistema
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && (
      document.documentElement.classList.contains('dark') ||
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    )
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMedia = (e: MediaQueryListEvent | MediaQueryList) => setIsDark(e.matches);
    if (mql) {
      // @ts-ignore
      mql.addEventListener ? mql.addEventListener('change', onMedia) : mql.addListener(onMedia);
    }
    const mo = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      if (mql) {
        // @ts-ignore
        mql.removeEventListener ? mql.removeEventListener('change', onMedia) : mql.removeListener(onMedia);
      }
      mo.disconnect();
    };
  }, []);

  const axisTickColor = isDark ? '#D1D5DB' : '#4B5563'; // gray-300 vs gray-600
  const gridStroke = isDark ? '#374151' : '#E5E7EB'; // gray-700 vs gray-200
  const tooltipBg = isDark ? '#111827' : '#FFFFFF'; // gray-900 vs white
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB'; // gray-700 vs gray-200
  const tooltipText = isDark ? '#E5E7EB' : '#111827'; // gray-200 vs gray-900
  const cursorStroke = isDark ? '#6B7280' : '#9CA3AF'; // gray-500 vs gray-400

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="h-full">
      {chartData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Sem dados para o período selecionado
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
<<<<<<< HEAD
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} />
          <XAxis
            dataKey="name"
            tick={{ fill: axisTickColor, fontSize: 12 }}
            axisLine={{ stroke: gridStroke }}
            tickLine={{ stroke: gridStroke }}
          />
          <YAxis
            tick={{ fill: axisTickColor, fontSize: 12 }}
            axisLine={{ stroke: gridStroke }}
            tickLine={{ stroke: gridStroke }}
            tickFormatter={(v: number) => currency.format(v as number)}
          />
          <Tooltip
            cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              color: tooltipText,
            }}
            labelStyle={{ color: tooltipText }}
            itemStyle={{ color: tooltipText }}
            formatter={(value: any, name: string) => {
              const label = name === 'sales' ? 'Vendas' : name;
              const val = typeof value === 'number' ? currency.format(value) : value;
              return [val, label];
            }}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: isDark ? '#60A5FA' : '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
<<<<<<< HEAD
}
;
=======
};
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

export default SalesChart;