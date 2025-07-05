import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, Download } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import OrderForm from './OrderForm';
import { generateOrderPDF, OrderPDFData } from '../../utils/pdfGenerator';

const Orders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const orders = [
    {
      id: '#12345',
      customer: 'João Silva',
      date: '2024-01-15',
      total: 1250.00,
      status: 'Confirmado',
      items: 3,
      paymentMethod: 'Boleto',
      dueDate: '2024-01-25'
    },
    {
      id: '#12346',
      customer: 'Maria Santos',
      date: '2024-01-15',
      total: 890.00,
      status: 'Pendente',
      items: 2,
      paymentMethod: 'PIX',
      dueDate: '2024-01-20'
    },
    {
      id: '#12347',
      customer: 'Carlos Oliveira',
      date: '2024-01-14',
      total: 2100.00,
      status: 'Enviado',
      items: 5,
      paymentMethod: 'Cartão',
      dueDate: '2024-01-30'
    },
    {
      id: '#12348',
      customer: 'Ana Costa',
      date: '2024-01-14',
      total: 750.00,
      status: 'Entregue',
      items: 1,
      paymentMethod: 'Dinheiro',
      dueDate: '2024-01-18'
    }
  ];

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const generatePDF = (orderId: string) => {
    // Mock order data for PDF generation
    const orderData: OrderPDFData = {
      id: orderId,
      customer: {
        name: 'João Silva',
        document: '123.456.789-00',
        address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
        phone: '(11) 99999-9999',
        email: 'joao@email.com'
      },
      date: '2024-01-15',
      dueDate: '2024-01-25',
      paymentMethod: 'Boleto',
      items: [
        {
          productName: 'Produto Premium A',
          quantity: 2,
          unitPrice: 89.90,
          total: 179.80
        },
        {
          productName: 'Produto Standard B',
          quantity: 1,
          unitPrice: 49.90,
          total: 49.90
        }
      ],
      subtotal: 229.70,
      discount: 0,
      total: 229.70,
      notes: 'Entrega expressa solicitada'
    };

    generateOrderPDF(orderData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Pedidos
        </h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Novo Pedido
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {orders.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total de Pedidos
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {orders.reduce((sum, order) => sum + order.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Valor Total
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {orders.filter(o => o.status === 'Pendente').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Pendentes
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {orders.filter(o => o.status === 'Entregue').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Entregues
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por número do pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button variant="secondary" icon={Filter}>
            Filtros
          </Button>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
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
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Itens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
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
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.paymentMethod}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Venc: {new Date(order.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {order.items} item(s)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={FileText}
                        onClick={() => generatePDF(order.id)}
                      >
                        PDF
                      </Button>
                      <Button size="sm">
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Pedido"
        size="xl"
      >
        <OrderForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Orders;