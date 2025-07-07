import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pedido
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {orders.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                <p>Nenhum pedido encontrado</p>
                <p className="text-sm mt-1">Os pedidos recentes aparecerão aqui.</p>
              </div>
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {order.order_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {order.customer_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
      {orders.length > 0 && (
        <div className="flex justify-center mt-4">
          <Link 
            to="/orders" 
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Ver todos os pedidos
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecentOrders;