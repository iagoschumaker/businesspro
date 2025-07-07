import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, UserPlus, Phone, Mail, MapPin, User, Calendar, DollarSign, Package, Trash2 } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import CustomerForm from './CustomerForm';
import OrderForm from '../Orders/OrderForm';
import { customersService } from '../../services/api';

// Define Customer interface
interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  document: string;
  address: string;
  orders: number;
  totalValue: string;
  lastOrder: string;
  status: string;
}

const Customers: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar clientes do banco de dados
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        console.log('Buscando clientes do banco de dados...');
        const response = await customersService.getAll();
        console.log('Resposta completa da API:', response);
        
        // Verificar se temos dados em diferentes formatos possíveis
        // Se a resposta já é um array, usamos ela diretamente
        const customersData = Array.isArray(response) ? response : 
                              response?.data?.data || response?.data || [];
        
        if (customersData && Array.isArray(customersData) && customersData.length > 0) {
          console.log('Clientes recebidos:', customersData);
          
          // Formatar os dados recebidos para o formato esperado pelo componente
          const formattedCustomers = customersData.map((customer: any) => ({
            id: customer.id,
            name: customer.name || 'Sem nome',
            email: customer.email || '',
            phone: customer.phone || '',
            document: customer.document || '',
            address: `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''}`,
            orders: customer.orderCount || 0,
            totalValue: customer.totalSpent ? `R$ ${customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
            lastOrder: customer.lastOrderDate || '-',
            status: customer.status || 'Ativo'
          }));
          
          setCustomers(formattedCustomers);
          setError(null);
        } else {
          console.log('Sem dados de clientes na resposta ou array vazio');
          setCustomers([]);
          // Se estamos recebendo uma resposta vazia, pode não ser um erro, apenas não há dados ainda
          setError(null)
        }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setError('Erro ao carregar clientes do banco de dados');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Função para excluir cliente
  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    try {
      setLoading(true);
      await customersService.delete(selectedCustomer.id);
      
      // Fechar modal e atualizar lista
      setIsDeleteModalOpen(false);
      refreshCustomerList();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      setError('Erro ao excluir cliente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar a lista após criar ou editar um cliente
  const refreshCustomerList = async () => {
    try {
      setLoading(true);
      const response = await customersService.getAll();
      console.log('Resposta completa da API:', response);
      
      // Verificar se temos dados em diferentes formatos possíveis
      // Se a resposta já é um array, usamos ela diretamente
      const customersData = Array.isArray(response) ? response : 
                            response?.data?.data || response?.data || [];
      
      if (customersData && Array.isArray(customersData) && customersData.length > 0) {
        console.log('Clientes recebidos:', customersData);
        
        const formattedCustomers = customersData.map((customer: any) => ({
          id: customer.id,
          name: customer.name || 'Sem nome',
          email: customer.email || '',
          phone: customer.phone || '',
          document: customer.document || '',
          address: `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''}`,
          orders: customer.orderCount || 0,
          totalValue: customer.totalSpent ? `R$ ${customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
          lastOrder: customer.lastOrderDate || '-',
          status: customer.status || 'Ativo'
        }));
        
        setCustomers(formattedCustomers);
        setError(null);
      } else {
        console.log('Sem dados de clientes na resposta ou array vazio');
        setCustomers([]);
        // Se estamos recebendo uma resposta vazia, pode não ser um erro, apenas não há dados ainda
        setError(null);
      }
    } catch (err) {
      console.error('Erro ao atualizar lista de clientes:', err);
      setError('Erro ao carregar clientes do banco de dados');
      setCustomers([]);
      // Removidos dados de fallback - apenas dados reais do banco devem ser usados
      // Em caso de erro, mostra apenas a mensagem de erro e uma lista vazia
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document.includes(searchTerm) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Clientes
        </h1>
        <Button 
          icon={Plus} 
          onClick={() => setIsModalOpen(true)}
        >
          Novo Cliente
        </Button>
      </div>
      
      {/* Mostrar mensagem de erro se houver algum problema */}
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          <span className="font-medium">Erro!</span> {error}
          <button 
            className="float-right text-red-700 hover:text-red-900 dark:text-red-800 dark:hover:text-red-900"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
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

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">Carregando clientes...</span>
        </div>
      )}

      {/* Mensagem quando não há clientes */}
      {!loading && filteredCustomers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-gray-400 mb-4">
            <User size={48} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm 
              ? `Não encontramos nenhum cliente correspondente a "${searchTerm}".` 
              : 'Você ainda não possui clientes cadastrados.'}
          </p>
          {searchTerm ? (
            <Button onClick={() => setSearchTerm('')}>Limpar busca</Button>
          ) : (
            <Button icon={UserPlus} onClick={() => setIsModalOpen(true)}>Cadastrar primeiro cliente</Button>
          )}
        </div>
      )}

      {/* Customer List */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.document}
                    </p>
                  </div>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {customer.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-2" />
                  {customer.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 mr-2" />
                  {customer.email}
                </div>
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{customer.address}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Pedidos</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{customer.orders}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{customer.totalValue}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Último pedido: {customer.lastOrder}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsProfileModalOpen(true);
                  }}
                >
                  Ver Perfil
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsNewOrderModalOpen(true);
                  }}
                >
                  Novo Pedido
                </Button>
              </div>
              <div className="mt-2">
                <Button 
                  size="sm" 
                  variant="danger" 
                  className="w-full flex items-center justify-center"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir Cliente
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Form Modal - New Customer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar novo cliente"
        size="lg"
      >
        <CustomerForm 
          onClose={() => {
            setIsModalOpen(false);
            refreshCustomerList();
          }} 
        />
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Confirmar exclusão"
        onClose={() => setIsDeleteModalOpen(false)}
        size="sm"
      >
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Tem certeza que deseja excluir o cliente {selectedCustomer?.name}?
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Esta ação não pode ser desfeita. Todos os dados associados a este cliente serão removidos permanentemente.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCustomer}
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Customer Form Modal - Edit Customer */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          refreshCustomerList();
        }}
        title={`Editar Cliente: ${selectedCustomer?.name || ''}`}
        size="lg"
      >
        {selectedCustomer && (
          <CustomerForm 
            onClose={() => setIsEditModalOpen(false)} 
            customer={selectedCustomer} 
            isEditing={true} 
          />
        )}
      </Modal>
      
      {/* New Order Modal */}
      <Modal
        isOpen={isNewOrderModalOpen}
        onClose={() => {
          setIsNewOrderModalOpen(false);
          refreshCustomerList();
        }}
        title={`Novo Pedido para ${selectedCustomer?.name || 'Cliente'}`}
        size="lg"
      >
        <OrderFormWrapper 
          customer={selectedCustomer} 
          onClose={() => setIsNewOrderModalOpen(false)} 
        />
      </Modal>

      {/* Customer Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          refreshCustomerList();
        }}
        title={selectedCustomer?.name || 'Perfil do Cliente'}
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h2>
                <p className="text-gray-500 dark:text-gray-400">{selectedCustomer.document}</p>
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                >
                  Editar
                </Button>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {selectedCustomer.status}
                </span>
              </div>
            </div>

            <Card>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Informações de Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</p>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <p>{selectedCustomer.phone}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p>{selectedCustomer.email}</p>
                  </div>
                </div>
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Endereço</p>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-gray-400" />
                    <p>{selectedCustomer.address}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Resumo de Compras</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 mr-2 text-blue-500" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de Pedidos</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.orders}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor Total</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.totalValue}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Último Pedido</h4>
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{selectedCustomer.lastOrder}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setIsProfileModalOpen(false)}>Fechar</Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Wrapper component to adapt OrderForm to work with a pre-selected customer
interface OrderFormWrapperProps {
  customer: Customer | null;
  onClose: () => void;
}

const OrderFormWrapper: React.FC<OrderFormWrapperProps> = ({ customer, onClose }) => {
  // This component exists to bridge the gap between the Customers component 
  // and the OrderForm component, which doesn't directly support pre-selecting a customer
  
  // We need to execute code when the OrderForm is rendered to pre-fill customer information
  React.useEffect(() => {
    if (customer) {
      // This is a workaround. In a real application, you would modify OrderForm
      // to accept a customer prop directly
      
      // For this demo, we'll use setTimeout to allow the form to render first
      setTimeout(() => {
        // Find the customer select dropdown and set its value
        const customerSelect = document.querySelector('select[name="customerId"]') as HTMLSelectElement;
        if (customerSelect) {
          customerSelect.value = customer.id.toString();
          
          // Trigger a change event so the form state updates
          const event = new Event('change', { bubbles: true });
          customerSelect.dispatchEvent(event);
        }
      }, 100);
    }
  }, [customer]);
  
  return <OrderForm onClose={onClose} />;
};

export default Customers;