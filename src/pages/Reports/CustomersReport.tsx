import React from 'react';
import { Users, TrendingUp, DollarSign, Calendar } from 'lucide-react';
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
  Cell,
  LineChart,
  Line
} from 'recharts';

interface CustomersReportProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const CustomersReport: React.FC<CustomersReportProps> = ({ dateRange }) => {
  const customerData = [
    { month: 'Jan', newCustomers: 25, activeCustomers: 150 },
    { month: 'Fev', newCustomers: 32, activeCustomers: 175 },
    { month: 'Mar', newCustomers: 28, activeCustomers: 190 },
    { month: 'Abr', newCustomers: 45, activeCustomers: 220 },
    { month: 'Mai', newCustomers: 38, activeCustomers: 245 },
    { month: 'Jun', newCustomers: 52, activeCustomers: 280 }
  ];

  const segmentData = [
    { name: 'Pessoa Física', value: 65, color: '#3B82F6' },
    { name: 'Pessoa Jurídica', value: 35, color: '#10B981' }
  ];

  const loyaltyData = [
    { category: 'Novos (1-3 pedidos)', customers: 120, percentage: 43 },
    { category: 'Regulares (4-10 pedidos)', customers: 85, percentage: 30 },
    { category: 'VIP (11+ pedidos)', customers: 75, percentage: 27 }
  ];

  const retentionData = [
    { month: 'Jan', retention: 85 },
    { month: 'Fev', retention: 87 },
    { month: 'Mar', retention: 82 },
    { month: 'Abr', retention: 89 },
    { month: 'Mai', retention: 91 },
    { month: 'Jun', retention: 88 }
  ];

  const stats = [
    {
      title: 'Total de Clientes',
      value: '1.234',
      change: '+8.2%',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Clientes Ativos',
      value: '856',
      change: '+12.5%',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Ticket Médio',
      value: 'R$ 485',
      change: '+5.8%',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Retenção Mensal',
      value: '88%',
      change: '+2.1%',
      icon: Calendar,
      color: 'text-orange-600'
    }
  ];

  const topCustomers = [
    { name: 'João Silva', orders: 45, total: 'R$ 28.500', lastOrder: '2024-01-12' },
    { name: 'Maria Santos', orders: 38, total: 'R$ 22.800', lastOrder: '2024-01-10' },
    { name: 'Carlos Oliveira', orders: 32, total: 'R$ 19.200', lastOrder: '2024-01-08' },
    { name: 'Ana Costa', orders: 28, total: 'R$ 16.800', lastOrder: '2024-01-06' }
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Acquisition */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Aquisição de Clientes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerData}>
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
                <Bar dataKey="newCustomers" fill="#3B82F6" name="Novos Clientes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segmentation */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Segmentação de Clientes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Retention */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Taxa de Retenção
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  className="text-sm text-gray-600 dark:text-gray-400"
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value}%`, 'Retenção']}
                />
                <Line 
                  type="monotone" 
                  dataKey="retention" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Loyalty */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Lealdade dos Clientes
          </h3>
          <div className="space-y-4">
            {loyaltyData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.customers} clientes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Clientes por Volume
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Comprado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Último Pedido
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {topCustomers.map((customer, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {customer.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {customer.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(customer.lastOrder).toLocaleDateString('pt-BR')}
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

export default CustomersReport;