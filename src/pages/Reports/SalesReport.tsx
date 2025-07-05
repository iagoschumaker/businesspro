import React from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface SalesReportProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const SalesReport: React.FC<SalesReportProps> = ({ dateRange }) => {
  const salesData = [
    { month: 'Jan', sales: 45000, orders: 120 },
    { month: 'Fev', sales: 52000, orders: 135 },
    { month: 'Mar', sales: 48000, orders: 128 },
    { month: 'Abr', sales: 61000, orders: 156 },
    { month: 'Mai', sales: 55000, orders: 142 },
    { month: 'Jun', sales: 67000, orders: 178 }
  ];

  const productData = [
    { name: 'Produto A', value: 35, color: '#3B82F6' },
    { name: 'Produto B', value: 25, color: '#10B981' },
    { name: 'Produto C', value: 20, color: '#F59E0B' },
    { name: 'Produto D', value: 15, color: '#EF4444' },
    { name: 'Outros', value: 5, color: '#8B5CF6' }
  ];

  const stats = [
    {
      title: 'Vendas Totais',
      value: 'R$ 328.000',
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Pedidos',
      value: '859',
      change: '+8.2%',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Ticket Médio',
      value: 'R$ 382',
      change: '+3.8%',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'Clientes Únicos',
      value: '567',
      change: '+15.3%',
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Período: {new Date(dateRange.startDate).toLocaleDateString('pt-BR')} até{' '}
        {new Date(dateRange.endDate).toLocaleDateString('pt-BR')}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                <p className={`text-sm ${stat.color} mt-1`}>
                  {stat.change}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vendas por Mês
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
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
                <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribuição por Produto
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Produtos Mais Vendidos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vendas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Participação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { name: 'Produto Premium A', sales: 'R$ 114.800', quantity: '1.276', share: '35.0%' },
                { name: 'Produto Standard B', sales: 'R$ 82.000', quantity: '1.643', share: '25.0%' },
                { name: 'Produto Especial C', sales: 'R$ 65.600', quantity: '328', share: '20.0%' },
                { name: 'Produto Basic D', sales: 'R$ 49.200', quantity: '984', share: '15.0%' }
              ].map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {product.share}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReport;