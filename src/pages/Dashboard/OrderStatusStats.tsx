import React from 'react';

interface OrderStatusStatsProps {
  statusCounts: {
    status: string;
    count: number;
  }[];
}

const OrderStatusStats: React.FC<OrderStatusStatsProps> = ({ statusCounts }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Entregue':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Total de pedidos para calcular porcentagens
  const totalOrders = statusCounts.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Pedidos por Status
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statusCounts.map((item) => (
          <div 
            key={item.status}
            className="border rounded-lg p-4 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {item.count}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className={`h-2.5 rounded-full ${getStatusColor(item.status).split(' ')[0]}`} 
                style={{ width: `${totalOrders > 0 ? (item.count / totalOrders) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
              {totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0}% do total
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderStatusStats;
