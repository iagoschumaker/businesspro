import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Loader, Edit, FileText, Eye, Trash } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import OrderForm from './OrderForm';
import { ordersService, customersService } from '../../services/api';
import { generateOrderPDF, OrderPDFData } from '../../utils/pdfGenerator';

interface Order {
  id: string;
  customer_id: number;
  customer_name?: string;
  date: string;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  total: number;
  status: string;
  items: number;
  payment_method?: string;
  due_date?: string;
  notes?: string;
  items_count?: number;
}

const Orders: React.FC<{}> = () => {
  // Função para exclusão em massa de pedidos
  const deleteAllOrders = async () => {
    if (!orders.length) {
      alert('Nenhum pedido para excluir.');
      return;
    }
    if (!window.confirm('ATENÇÃO: Isso tentará excluir TODOS os pedidos do banco de dados. Deseja continuar?')) {
      return;
    }
    setLoading(true);
    let deleted = 0;
    let failed = 0;
    for (const order of orders) {
      try {
        // Excluir o pedido diretamente
        await ordersService.delete(Number(order.id));
        deleted++;
      } catch (error) {
        failed++;
        console.error('Erro ao excluir pedido ID', order.id, error);
      }
    }
    setLoading(false);
    alert(`Total excluídos: ${deleted}\nFalharam: ${failed}`);
    refreshOrderList();
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<Order | null>(null);

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

  const statusOptions = ['Pendente', 'Confirmado', 'Enviado', 'Entregue', 'Cancelado'];

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
  
  // Função para atualizar o status de um pedido
  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      await ordersService.updateStatus(Number(id), newStatus);
      // Atualiza o pedido na lista local sem precisar recarregar todos os pedidos
      setOrders(orders.map(order => {
        if (order.id === id) {
          return { ...order, status: newStatus };
        }
        return order;
      }));
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para tentar forçar a exclusão de um pedido diretamente via API
  const forceDeleteOrder = async (id: string) => {
    if (window.confirm('ATENÇÃO: Você está tentando excluir um pedido.\n\nTem certeza que deseja continuar?')) {
      try {
        setLoading(true);
        const orderId = Number(id);
        
        // Excluir pedido diretamente
        await ordersService.delete(orderId);
        alert('Pedido excluído com sucesso!');
        refreshOrderList();
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        alert('Erro ao excluir pedido. Verifique o console para mais detalhes.');
      } finally {
        setLoading(false);
      }
    }
  }


  // Função para gerar PDF de um pedido
  const generatePDF = async (order: Order) => {
    try {
      // Obter dados completos do pedido se necessário
      let orderDetails = order;
      let customerDetails = null;
      
      if (!orderDetails.items_count) {
        const response = await ordersService.getById(Number(order.id));
        if (response) {
          orderDetails = response;
        }
      }
      
      // Tentar buscar dados completos do cliente se tivermos o customer_id
      if (orderDetails.customer_id) {
        try {
          const customerResponse = await customersService.getById(Number(orderDetails.customer_id));
          if (customerResponse) {
            customerDetails = customerResponse;
          }
        } catch (customerError) {
          console.warn('Não foi possível obter detalhes do cliente:', customerError);
        }
      }
      
      // Como não temos uma função getItems no serviço, usamos um array vazio para os itens
      let orderItems: Array<{id?: number; product_name?: string; product_id?: number; product_code?: string; quantity?: number; unit?: string; unit_price?: number; total?: number}> = [];
      
      // Formatar os dados para o PDF
      const pdfData: OrderPDFData = {
        id: orderDetails.id,
        date: orderDetails.date,
        dueDate: orderDetails.due_date,
        paymentMethod: orderDetails.payment_method || 'Não especificado',
        customer: {
          id: orderDetails.customer_id,
          name: orderDetails.customer_name || 'Cliente não identificado',
          document: customerDetails?.document || customerDetails?.cpf || customerDetails?.cnpj || 'Documento não informado',
          address: customerDetails?.address || 'Endereço não informado',
          phone: customerDetails?.phone || 'Telefone não informado',
          email: customerDetails?.email || 'E-mail não informado',
        },
        items: orderItems.length > 0 ? 
          orderItems.map((item: any) => ({
            codigo: item.product_code || '',
            productName: item.product_name || `Produto ${item.product_id}`,
            quantity: item.quantity || 1,
            unitPrice: item.unit_price || 0,
            total: item.total || 0,
            unidade: item.unit || 'un'
          })) : [
            {
              productName: `Pedido #${orderDetails.id}`,
              quantity: 1,
              unitPrice: orderDetails.total,
              total: orderDetails.total
            }
          ],
        // Incluindo subtotal, desconto e frete corretamente
        subtotal: orderDetails.subtotal || orderDetails.total,
        discount: orderDetails.discount || 0,
        shipping: orderDetails.shipping || 0,
        total: orderDetails.total,
        notes: orderDetails.notes
      };
      
      // Gerar e abrir o PDF
      await generateOrderPDF(pdfData);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF do pedido.');
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
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                    Pedido
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%]">
                    Cliente
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                    Data
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                    Itens
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[12%]">
                    Total
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[13%]">
                    Status
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {order.id}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white truncate">
                        {order.customer_name}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </div>
                      {order.due_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Venc: {new Date(order.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {order.items} item(s)
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="relative inline-block text-left">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`appearance-none inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border-none cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${getStatusColor(order.status)}`}
                          style={{ textAlign: 'center', textAlignLast: 'center' }}
                        >
                          {statusOptions.map(status => (
                            <option 
                              key={status} 
                              value={status}
                              className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center`}
                              style={{ textAlign: 'center' }}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Eye}
                          onClick={() => {
                            setViewOrderDetails(order);
                            setIsViewModalOpen(true);
                          }}
                          className="px-1 py-0.5 text-xs"
                        >
                          Ver
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit}
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsEditModalOpen(true);
                          }}
                          className="px-1 py-0.5 text-xs"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Trash}
                          onClick={() => forceDeleteOrder(order.id)}
                          className="px-1 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          EXCLUIR
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
      
      {/* Order View Modal - Visualizar Detalhes do Pedido */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Detalhes do Pedido: ${viewOrderDetails?.id || ''}`}
        size="lg"
      >
        {viewOrderDetails && (
          <div className="space-y-6">
            {/* Dados do cliente */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID do Cliente:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.customer_id}</p>
                </div>
              </div>
            </div>
            
            {/* Dados do pedido */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Informações do Pedido</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{new Date(viewOrderDetails.date).toLocaleDateString('pt-BR')}</p>
                </div>
                {viewOrderDetails.due_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Vencimento:</p>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(viewOrderDetails.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</p>
                  <p className="text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewOrderDetails.status)}`}>
                      {viewOrderDetails.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Forma de Pagamento:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.payment_method || 'Não especificado'}</p>
                </div>
              </div>
            </div>
            
            {/* Valores */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Valores</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantidade de Itens:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.items} item(s)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total:</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">R$ {viewOrderDetails.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            
            {/* Observações */}
            {viewOrderDetails.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Observações</h3>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{viewOrderDetails.notes}</p>
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                icon={FileText}
                onClick={() => {
                  generatePDF(viewOrderDetails);
                }}
              >
                Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
};

export default Orders;
