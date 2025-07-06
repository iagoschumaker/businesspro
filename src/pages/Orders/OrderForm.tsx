import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Button from '../../components/Common/Button';
import { ordersService, customersService, productsService } from '../../services/api';

interface OrderFormProps {
  onClose: () => void;
  order?: {
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
  };
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isSearching?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({ onClose, order }) => {
  // Estado para controlar mensagem de sucesso
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Boleto',
    dueDate: '',
    installments: 1,
    installmentPlan: '30',
    notes: ''
  });
  
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [installmentDates, setInstallmentDates] = useState<string[]>([]);

  const [items, setItems] = useState<OrderItem[]>([
    {
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }
  ]);

  // Estado para armazenar clientes e produtos reais do banco de dados
  const [customers, setCustomers] = useState<Array<{id: string, name: string, document: string}>>([]);
  const [products, setProducts] = useState<Array<{id: string, name: string, price: number}>>([]);
  
  // Preencher o formulário com os dados do pedido existente quando for edição
  useEffect(() => {
    if (order) {
      console.log('Editando pedido existente:', order);
      setFormData({
        customerId: order.customer_id.toString(),
        customerName: order.customer_name || '',
        date: order.date,
        paymentMethod: order.payment_method || 'Boleto',
        dueDate: order.due_date || '',
        installments: 1, // Default, pode ser ajustado se necessário
        installmentPlan: '30',
        notes: order.notes || ''
      });

      // Carregar os itens do pedido será implementado após integração completa da API
      // Por enquanto, mantemos pelo menos um item vazio para o formulário
    }
  }, [order]);

  // Carregando clientes e produtos do banco de dados quando o componente monta
  useEffect(() => {
    const fetchCustomersAndProducts = async () => {
      try {
        console.log('Iniciando carregamento de clientes e produtos...');
        
        // Buscando clientes do banco de dados
        console.log('Chamando customersService.getAll()...');
        const customersResponse = await customersService.getAll();
        console.log('Resposta bruta da API de clientes:', customersResponse);
        
        if (customersResponse) {
          // Garantir que a resposta é um array
          const customersArray = Array.isArray(customersResponse) 
            ? customersResponse 
            : [customersResponse];
            
          console.log('Dados brutos de clientes:', customersArray);
          
          const formattedCustomers = customersArray.map((customer: any) => ({
            id: customer.id ? customer.id.toString() : '',
            name: customer.name || 'Cliente sem nome',
            document: customer.document || 'Sem documento'
          }));
          
          console.log('Clientes formatados:', formattedCustomers);
          setCustomers(formattedCustomers);
          
          // Mostrar o primeiro cliente como exemplo
          if (formattedCustomers.length > 0) {
            console.log('Exemplo de cliente carregado:', formattedCustomers[0]);
          } else {
            console.warn('Nenhum cliente encontrado no banco de dados!');
            setCustomers([]);
          }
        } else {
          console.error('Resposta da API de clientes não contém dados!');
        }
        
        // Buscando produtos do banco de dados
        console.log('Chamando productsService.getAll()...');
        const productsResponse = await productsService.getAll();
        console.log('Resposta bruta da API de produtos:', productsResponse);
        
        if (productsResponse) {
          // Garantir que a resposta é um array
          const productsArray = Array.isArray(productsResponse) 
            ? productsResponse 
            : [productsResponse];
            
          console.log('Dados brutos de produtos:', productsArray);
          
          const formattedProducts = productsArray.map((product: any) => ({
            id: product.id ? product.id.toString() : '',
            name: product.name || 'Produto sem nome',
            price: typeof product.price === 'number' ? product.price : 0
          }));
          
          console.log('Produtos formatados:', formattedProducts);
          setProducts(formattedProducts);
          
          // Mostrar o primeiro produto como exemplo
          if (formattedProducts.length > 0) {
            console.log('Exemplo de produto carregado:', formattedProducts[0]);
          } else {
            console.warn('Nenhum produto encontrado no banco de dados!');
            setProducts([]);
          }
        } else {
          console.error('Resposta da API de produtos não contém dados!');
        }
        
      } catch (error) {
        console.error('Erro ao carregar clientes ou produtos:', error);
        alert('Erro ao carregar dados de clientes e produtos. Por favor, tente novamente mais tarde.');
        setCustomers([]);
        setProducts([]);
      }
    };
    
    fetchCustomersAndProducts();
  }, []);

  // Handler para cálculo de datas das parcelas
  const calculateInstallmentDates = (data: typeof formData) => {
    if (!data.dueDate || parseInt(data.installments.toString()) <= 1) {
      setInstallmentDates([]);
      return;
    }
    
    const numInstallments = parseInt(data.installments.toString());
    const intervalDays = parseInt(data.installmentPlan);
    
    // Usa a data de vencimento informada como primeira parcela
    const firstDueDate = new Date(data.dueDate);
    const dates: string[] = [];
    
    // A primeira parcela é a data de vencimento informada
    dates.push(data.dueDate);
    
    // Calcula as parcelas seguintes com base na primeira
    for (let i = 1; i < numInstallments; i++) {
      const nextDate = new Date(firstDueDate);
      nextDate.setDate(firstDueDate.getDate() + (intervalDays * i));
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    
    setInstallmentDates(dates);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    
    setFormData(newData);
    
    // Recalcular datas das parcelas quando os campos relevantes mudarem
    // Usando a data de vencimento (dueDate) como data da primeira parcela
    if (['dueDate', 'installments', 'installmentPlan', 'paymentMethod'].includes(e.target.name)) {
      calculateInstallmentDates(newData);
    }
  };
  
  // Funções para pesquisa de cliente
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearchTerm(e.target.value);
    setIsSearchingCustomer(true);
  };
  
  const handleCustomerSelect = (customer: { id: string, name: string, document: string }) => {
    setFormData({
      ...formData,
      customerId: customer.id,
      customerName: customer.name,
    });
    setIsSearchingCustomer(false);
    setCustomerSearchTerm('');
  };
  
  // Função para lidar com a tecla Enter em campos do formulário
  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Previne o envio do formulário
      
      // Move o foco diretamente para o próximo campo relevante
      if (field === 'quantity') {
        // Se estamos no campo quantidade, vai para o preço unitário do mesmo item
        const unitPriceInput = document.querySelector(`#unitPrice-${index}`) as HTMLElement;
        if (unitPriceInput) {
          unitPriceInput.focus();
          return;
        }
      }
      
      // Comportamento padrão se não for um caso especial
      handleKeyDown(e);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Previne o envio do formulário
      
      // Encontra todos os elementos que podem receber foco
      const focusableElements = Array.from(
        document.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      
      // Encontra o índice do elemento atual
      const index = focusableElements.indexOf(e.target as HTMLElement);
      
      // Move o foco para o próximo elemento
      if (index > -1 && index < focusableElements.length - 1) {
        (focusableElements[index + 1] as HTMLElement).focus();
      }
    }
  };
  
  // Funções para pesquisa de produto
  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    setProductSearchTerm(e.target.value);
    
    const newItems = [...items];
    newItems[index] = { ...newItems[index], isSearching: true };
    setItems(newItems);
  };
  
  const handleProductSelect = (index: number, product: { id: string, name: string, price: number }) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      total: newItems[index].quantity * product.price,
      isSearching: false
    };
    
    setItems(newItems);
    setProductSearchTerm('');
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.price;
      }
    }
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalOrder = items.reduce((sum, item) => sum + item.total, 0);
  
  // Função para salvar ou atualizar o pedido
  const handleSaveOrder = () => {
    console.log('Salvando pedido...');
    
    // Validações básicas antes de enviar
    if (!formData.customerId) {
      window.alert('Por favor, selecione um cliente.');
      return;
    }
    
    if (items.length === 0 || items.some(item => !item.productId)) {
      window.alert('Por favor, adicione pelo menos um produto ao pedido.');
      return;
    }
    
    try {
      const orderData = {
        ...formData,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        total: totalOrder,
        createdAt: new Date().toISOString()
      };
      
      console.log('Dados do pedido:', orderData);
      // Aqui seria feita a chamada à API para salvar o pedido
      
      window.alert('Pedido criado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      window.alert('Erro ao criar pedido. Verifique o console para mais detalhes.');
    }
  };

  // Função para debug de eventos do React
  useEffect(() => {
    console.log('OrderForm montado');
    return () => {
      console.log('OrderForm desmontado');
    };
  }, []);

  // Effect para atualizar o console quando success mudar
  useEffect(() => {
    if (success) {
      console.log('Estado success alterado para true');
    }
  }, [success]);

  return (
    <div className="space-y-6 relative">
      {/* Mensagem de sucesso condicional */}
      {success && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg z-50 shadow-lg">
          Pedido criado com sucesso!
        </div>
      )}
      {/* Customer and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cliente *
          </label>
          <div className="relative">
            {formData.customerId ? (
              <div className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <span className="text-gray-900 dark:text-white">{formData.customerName}</span>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => {
                    setFormData({ ...formData, customerId: '', customerName: '' });
                    setIsSearchingCustomer(true);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="Pesquisar cliente..."
                value={customerSearchTerm}
                onChange={handleCustomerSearch}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            )}
            
            {isSearchingCustomer && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                {customerSearchTerm !== '' && customers
                  .filter(customer =>
                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    customer.document.includes(customerSearchTerm)
                  )
                  .map(customer => (
                    <div
                      key={customer.id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{customer.document}</div>
                    </div>
                  ))}
                <div className="flex justify-end p-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
                    onClick={() => {
                      setIsSearchingCustomer(false);
                      setCustomerSearchTerm('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data do Pedido *
          </label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleFormChange}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Forma de Pagamento *
          </label>
          <select
            name="paymentMethod"
            required
            value={formData.paymentMethod}
            onChange={handleFormChange}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="Boleto">Boleto</option>
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data de Vencimento
          </label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleFormChange}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        {formData.paymentMethod === 'Boleto' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parcelas
              </label>
              <input
                type="number"
                name="installments"
                min="1"
                value={formData.installments}
                onChange={handleFormChange}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Intervalo (dias)
              </label>
              <select
                name="installmentPlan"
                value={formData.installmentPlan}
                onChange={handleFormChange}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="30">30 dias</option>
                <option value="15">15 dias</option>
                <option value="7">7 dias</option>
              </select>
            </div>
          </>
        )}
        
        {installmentDates.length > 1 && (
          <div className="col-span-1 md:col-span-2 mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datas de Vencimento</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {installmentDates.map((date, index) => (
                <div key={index} className="text-sm flex">
                  <span className="font-medium min-w-[100px]">{index + 1}ª parcela:</span> 
                  <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Itens do Pedido
          </h3>
          <Button type="button" size="sm" icon={Plus} onClick={addItem}>
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Produto
                  </label>
                  <div className="relative">
                    {item.productId ? (
                      <div className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <span className="text-gray-900 dark:text-white">{item.productName}</span>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              productId: '',
                              productName: '',
                              unitPrice: 0,
                              total: 0,
                              isSearching: true
                            };
                            setItems(newItems);
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Pesquisar produto..."
                        value={item.isSearching ? productSearchTerm : ''}
                        onChange={(e) => handleProductSearch(e, index)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    )}
                    
                    {item.isSearching && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        {productSearchTerm !== '' && products
                          .filter(product =>
                            product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
                          )
                          .map(product => (
                            <div
                              key={product.id}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => handleProductSelect(index, product)}
                            >
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">R$ {product.price.toFixed(2)}</div>
                            </div>
                          ))}
                        <div className="flex justify-end p-2 border-t border-gray-100 dark:border-gray-700">
                          <button
                            type="button"
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
                            onClick={() => {
                              const newItems = [...items];
                              newItems[index].isSearching = false;
                              setItems(newItems);
                              setProductSearchTerm('');
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => handleItemKeyDown(e, index, 'quantity')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor Unit.
                  </label>
                  <input
                    id={`unitPrice-${index}`}
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total
                  </label>
                  <input
                    type="text"
                    value={`R$ ${item.total.toFixed(2)}`}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Total */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              Total do Pedido:
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {totalOrder.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleFormChange}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        
        {/* Botão final com validações e lógica completa */}
        <button 
          type="button" 
          onClick={() => {
            console.log('Salvando pedido...');
            
            // Verificando qual cliente está sendo usado
            console.log('IMPORTANTE - Dados do cliente selecionado:', {
              id: formData.customerId,
              name: formData.customerName,
              id_tipo: typeof formData.customerId
            });
            
            // Validações de cliente
            if (!formData.customerId) {
              alert('Erro: Cliente não selecionado');
              console.log('Erro: Cliente não selecionado');
              return;
            }
            
            // Verificando os itens do pedido no estado
            console.log('Itens do pedido:', JSON.stringify(items));
            
            // Validações de itens
            if (items.length === 0) {
              alert('Erro: O pedido precisa ter pelo menos um produto');
              console.log('Erro: Pedido sem produtos');
              return;
            }
            
            // Verificando se tem itens sem produtoId
            const invalidItems = items.filter(item => !item.productId);
            if (invalidItems.length > 0) {
              alert('Erro: Existem produtos não selecionados no pedido');
              console.log('Produtos inválidos:', invalidItems);
              return;
            }
            
            try {
              // Dados do pedido
              const orderData = {
                ...formData,
                items: items.map(item => ({
                  productId: item.productId,
                  productName: item.productName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total
                })),
                total: totalOrder,
                createdAt: new Date().toISOString(),
                installmentDates: installmentDates
              };
              
              // Log dos dados para debug
              console.log('Dados do pedido:', orderData);
              
              // Enviando dados para a API usando o serviço correto
              try {
                console.log('Preparando dados para API...');
                
                // Validando se há itens no pedido
                if (items.length === 0) {
                  throw new Error('Pedido deve conter pelo menos um item');
                }
                
                // Filtrar apenas itens válidos (com productId)
                const validItems = items.filter(item => item.productId);
                console.log('Itens válidos:', validItems);
                
                if (validItems.length === 0) {
                  throw new Error('Pedido deve conter pelo menos um produto válido');
                }
                
                // Convertendo o orderData para o formato EXATO esperado pela API
                const apiOrderData = {
                  customer_id: Number(formData.customerId),
                  date: formData.date,
                  payment_method: formData.paymentMethod,
                  due_date: formData.dueDate || undefined,
                  notes: formData.notes || undefined,
                  // Campo importante: itens do pedido - verificando se temos itens válidos
                  items: validItems.map(item => ({
                    product_id: Number(item.productId),
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unitPrice)
                  }))
                };
                
                console.log('Objeto completo para API:', JSON.stringify(apiOrderData));
                
                // Garantindo que os tipos estejam corretos conforme a API espera
                const customerId = Number(apiOrderData.customer_id);
                console.log('ID do cliente (original):', formData.customerId);
                console.log('ID do cliente (convertido):', customerId);
                
                const finalOrderData = {
                  // Convertendo para string e depois para número para garantir
                  // que não há problemas de tipo ou formatacão
                  customer_id: customerId,
                  date: String(apiOrderData.date),
                  payment_method: String(apiOrderData.payment_method),
                  due_date: apiOrderData.due_date ? String(apiOrderData.due_date) : undefined,
                  notes: apiOrderData.notes,
                  items: apiOrderData.items.map(item => ({
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price)
                  }))
                };
                
                console.log('Dados finais enviados para API:', JSON.stringify(finalOrderData));
                
                // Verificar se é criação ou atualização
                const isUpdate = !!order?.id;
                
                if (isUpdate) {
                  // Para pedidos existentes, só atualizamos o status
                  const orderId = parseInt(order!.id, 10);
                  
                  ordersService.updateStatus(orderId, formData.paymentMethod)
                    .then(() => {
                      setSuccess(true);
                      setTimeout(() => {
                        onClose();
                      }, 1500);
                    })
                    .catch(() => {
                      alert('Erro ao atualizar status do pedido.');
                    });
                } else {
                  // Criar novo pedido normalmente
                  ordersService.create(finalOrderData)
                    .then(response => {
                      console.log('Pedido criado com sucesso!', response);
                      // Define success como true para mostrar mensagem
                      setSuccess(true);
                      // Fecha o formulário após 1.5 segundos
                      setTimeout(() => {
                        onClose();
                      }, 1500);
                    })
                    .catch(error => {
                      console.error('Erro ao criar pedido:', error);
                      if (error.response) {
                        console.error('Status:', error.response.status);
                        console.error('Detalhes do erro:', error.response.data);
                      }
                      alert('Erro ao criar pedido. Verifique os dados e tente novamente.');
                    });
                }
              } catch (error) {
                console.error('Erro ao processar dados para API:', error);
                alert('Erro ao processar dados do pedido: ' + (error as Error).message);
              }
            } catch (error) {
              console.error('Erro ao processar pedido:', error);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Criar Pedido
        </button>
      </div>
    </div>
  );
};

export default OrderForm;