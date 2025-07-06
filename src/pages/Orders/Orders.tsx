import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Loader, Edit } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import OrderForm from './OrderForm';
import { ordersService, customersService } from '../../services/api';

interface Order {
  id: string;
  customer_id: number;
  customer_name?: string;
  date: string;
  total: number;
  status: string;
  items: number;
  payment_method?: string;
  due_date?: string;
  notes?: string;
  items_count?: number;
}

const Orders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const refreshOrderList = async () => {
    try {
      setLoading(true);
      console.log('Buscando pedidos do banco de dados...');
      const response = await ordersService.getAll();
      console.log('Resposta bruta da API de pedidos:', response);
      
      if (response) {
        console.log('Pedidos recebidos:', response);
        
        // Formatar os dados recebidos para o formato esperado pelo componente
        const formattedOrders = await Promise.all((Array.isArray(response) ? response : [response]).map(async (order: any) => {
          // Para cada pedido, buscar os dados do cliente se necessário
          let customerName = order.customer_name || '';
          
          if (!customerName && order.customer_id) {
            try {
              const customerResponse = await customersService.getById(order.customer_id);
              if (customerResponse) {
                customerName = customerResponse.name || 'Cliente sem nome';
              }
            } catch (err) {
              console.error('Erro ao buscar dados do cliente:', err);
            }
          }
          
          return {
            id: order.id ? String(order.id) : '',
            customer_id: order.customer_id || 0,
            customer_name: customerName,
            date: order.date || new Date().toISOString().split('T')[0],
            total: order.total || 0,
            status: order.status || 'Pendente',
            items: order.items_count || 0,
            payment_method: order.payment_method || '',
            due_date: order.due_date || '',
            notes: order.notes || ''
          };
        }));
        
        setOrders(formattedOrders);
        setError(null);
      } else {
        console.error('Resposta da API não contém dados de pedidos');
        setError('Não há pedidos cadastrados no banco de dados.');
        setOrders([]);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Erro ao carregar pedidos do banco de dados');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar pedidos quando o componente montar
  useEffect(() => {
    refreshOrderList();
  }, []);
  
  const filteredOrders = orders.filter(order => {
    // Garante que o ID é tratado como string antes de chamar toLowerCase()
    const orderId = String(order.id).toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    return orderId.includes(searchTermLower) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTermLower));
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pedidos
        </h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={refreshOrderList}
          >
            Atualizar
          </Button>
          <Button 
            variant="primary"
            size="sm"
            icon={Plus} 
            onClick={() => setIsModalOpen(true)}
          >
            Novo Pedido
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-grow max-w-sm">
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 sm:text-sm"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              icon={Filter}
            >
              Filtrar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Carregando pedidos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="secondary" onClick={refreshOrderList}>Tentar novamente</Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum pedido encontrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {searchTerm ? 'Tente outro termo de busca ou' : 'Cadastre seu primeiro pedido.'}
            </p>
            {searchTerm && (
              <Button 
                variant="secondary" 
                className="mb-2"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </Button>
            )}
            <Button 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Novo Pedido
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
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
                        {order.payment_method}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </div>
                      {order.due_date && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Venc: {new Date(order.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.items} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit}
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1"
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Form Modal - Novo Pedido */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Pedido"
        size="xl"
      >
        <OrderForm 
          onClose={() => {
            setIsModalOpen(false);
            refreshOrderList();
          }} 
        />
      </Modal>
      
      {/* Order Form Modal - Editar Pedido */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Pedido: ${selectedOrder?.id || ''}`}
        size="xl"
      >
        <OrderForm 
          order={selectedOrder!}
          onClose={() => {
            setIsEditModalOpen(false);
            refreshOrderList();
          }} 
        />
      </Modal>
    </div>
  );
};

export default Orders;
