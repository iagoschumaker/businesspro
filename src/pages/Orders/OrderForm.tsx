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
  
  // Função para obter a data local atual no formato correto (YYYY-MM-DD)
  const getCurrentLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para obter a data e hora local atual no formato completo
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    date: getCurrentLocalDate(),
    dateTime: getCurrentLocalDateTime(),
    paymentMethod: 'Boleto',
    dueDate: '',
    installments: 1,
    installmentPlan: '30',
    discount: 0,
    shipping: 0,
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
  
  // Cálculo do subtotal (soma dos totais dos itens)
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
  // Garantir que o valor do desconto seja numérico
  const discountPercentage = Number(formData.discount) || 0;
  
  // Cálculo do valor do desconto baseado na porcentagem
  const discountAmount = (subtotal * discountPercentage) / 100;
  
  // Garantir que o valor do frete seja numérico
  const shippingValue = Number(formData.shipping) || 0;
  
  // Cálculo do total do pedido, com desconto aplicado apenas ao subtotal
  const totalOrder = Number(subtotal) - Number(discountAmount) + Number(shippingValue);

  // Estado para armazenar clientes e produtos reais do banco de dados
  const [customers, setCustomers] = useState<Array<{id: string, name: string, document: string}>>([]);
  const [products, setProducts] = useState<Array<{id: string, name: string, price: number}>>([]);
  
  // Preencher o formulário com os dados do pedido existente quando for edição
  useEffect(() => {
    if (order) {
      console.log('Editando pedido existente:', order);
      
      // Inicializar com valores básicos do pedido (serão substituídos se houver detalhes)
      setFormData({
        customerId: order.customer_id.toString(),
        customerName: order.customer_name || '',
        date: order.date || getCurrentLocalDate(),
        dateTime: getCurrentLocalDateTime(), // Sempre usar a data/hora atual para edição
        paymentMethod: order.payment_method || 'Boleto',
        dueDate: order.due_date || '',
        installments: 1, // Valor padrão
        installmentPlan: '30',
        discount: 0, // Valor padrão para desconto
        shipping: 0, // Valor padrão para frete
        notes: order.notes || ''
      });
      
      // Carregar os detalhes completos do pedido da API, incluindo itens e parcelas
      if (order.id) {
        // Converter string para número
        const orderId = parseInt(order.id, 10);
        
        // Buscar detalhes completos do pedido
        ordersService.getById(orderId)
          .then((response: any) => {
            console.log('Detalhes completos do pedido:', response);
            
            // Atualizar o formulário com todos os dados, incluindo parcelas
            setFormData(prev => ({
              ...prev,
              // Usar os valores reais de parcelas do pedido ou manter os valores anteriores
              // Garantir que installments seja um número válido
              installments: response.installments ? parseInt(response.installments.toString(), 10) : prev.installments,
              installmentPlan: response.installment_plan || prev.installmentPlan,
            }));
            
            // Log para debug - verificar se as parcelas estão sendo carregadas
            console.log('Parcelas carregadas:', response.installments);
            
            // Carregar os itens do pedido
            if (response.items && Array.isArray(response.items) && response.items.length > 0) {
              // Mapear os itens do pedido para o formato usado pelo formulário
              const orderItems = response.items.map((item: {
                product_id: number;
                product_name?: string;
                quantity: number;
                unit_price: number;
                total: number;
              }) => ({
                productId: item.product_id.toString(),
                productName: item.product_name || '',
                quantity: item.quantity,
                unitPrice: item.unit_price,
                total: item.total
              }));
              
              console.log('Itens do pedido formatados:', orderItems);
              setItems(orderItems);
            }
          })
          .catch((error: Error) => {
            console.error('Erro ao carregar detalhes do pedido:', error);
            // Já inicializamos com valores padrão acima, então não precisamos fazer nada aqui
          });
      }
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

  // Estado para armazenar as datas calculadas das parcelas
  const calculateInstallmentDates = (data: typeof formData) => {
    // Se a forma de pagamento não for parcelada ou não houver parcelas, limpar as datas
    if (parseInt(data.installments.toString()) <= 0) {
      setInstallmentDates([]);
      return;
    }
    
    // Usar a data de vencimento como base para a primeira parcela
    if (!data.dueDate) {
      setInstallmentDates([]);
      return;
    }
    
    const dates: string[] = [];
    const firstDueDate = new Date(data.dueDate);
    const installmentCount = parseInt(data.installments.toString());
    const intervalDays = parseInt(data.installmentPlan);
    
    for (let i = 0; i < installmentCount; i++) {
      const date = new Date(firstDueDate);
      date.setDate(date.getDate() + i * intervalDays);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Estas datas são apenas informativas e não criarão boletos
    setInstallmentDates(dates);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Tratamento especial para o campo dateTime para converter de formato ISO para o formato que estamos usando
    if (name === 'dateTime' && value) {
      // Se o valor contém 'T' (formato ISO), convertemos para o formato "YYYY-MM-DD HH:MM"
      if (value.includes('T')) {
        const [datePart, timePart] = value.split('T');
        formattedValue = `${datePart} ${timePart.substring(0, 5)}`; // Pega apenas HH:MM
      }
    }
    
    const newData = {
      ...formData,
      [name]: formattedValue
    };
    
    setFormData(newData);
    
    // Se a data principal mudar, vamos atualizar a data/hora completa
    if (name === 'date') {
      // Preserva a parte da hora do dateTime atual
      const currentTime = formData.dateTime.split(' ')[1] || '00:00';
      setFormData({
        ...newData,
        dateTime: `${formattedValue} ${currentTime}`
      });
    }
    
    // Recalcular datas das parcelas quando os campos relevantes mudarem
    // Usando a data de vencimento (dueDate) como data da primeira parcela
    if (['dueDate', 'installments', 'installmentPlan', 'paymentMethod'].includes(name)) {
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
  
  // Função para salvar ou atualizar o pedido
  const handleSaveOrder = async () => {
    console.log('Salvando pedido...');
    
    // Validações básicas antes de enviar
    if (!formData.customerId) {
      window.alert('Por favor, selecione um cliente.');
      return;
    }
    
    // Verificar se temos itens válidos
    const validItems = items.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      window.alert('Por favor, adicione pelo menos um produto válido ao pedido.');
      return;
    }
    
    try {
      // Preparar os dados para a API no formato correto
      // Garantir que todos os campos numéricos sejam de fato números
      const customerId = Number(formData.customerId);
      if (isNaN(customerId)) {
        throw new Error('ID do cliente inválido');
      }
      
      // Criar objeto com os dados formatados corretamente
      const apiOrderData = {
        customer_id: customerId,
        date: getCurrentLocalDate(), // Sempre usar a data atual
        date_time: formData.dateTime || getCurrentLocalDateTime(), // Incluir data e hora
        payment_method: formData.paymentMethod,
        // Adicionar número de parcelas e plano de parcelamento
        installments: parseInt(formData.installments.toString(), 10) || 1,
        installment_plan: formData.installmentPlan || '30',
        // Adicionar campos de desconto e frete
        discount: Number(formData.discount) || 0,
        shipping: Number(formData.shipping) || 0,
        // Remover campos vazios para evitar erros na API
        due_date: formData.dueDate || undefined,
        notes: formData.notes || undefined,
        // Garantir que todos os campos numéricos sejam números válidos
        items: validItems.map(item => {
          const productId = Number(item.productId);
          const quantity = Number(item.quantity);
          const unitPrice = Number(item.unitPrice);
          
          if (isNaN(productId) || isNaN(quantity) || isNaN(unitPrice)) {
            throw new Error('Dados do produto inválidos');
          }
          
          return {
            product_id: productId,
            quantity: quantity,
            unit_price: unitPrice
          };
        })
      };
      
      console.log('Enviando dados para API:', JSON.stringify(apiOrderData));
      
      // Verificar se é criação ou atualização
      if (order?.id) {
        // Atualizar pedido existente
        const orderId = parseInt(order.id, 10);
        if (isNaN(orderId)) {
          throw new Error('ID do pedido inválido');
        }
        
        try {
          const response = await ordersService.update(orderId, apiOrderData);
          console.log('Pedido atualizado com sucesso:', response);
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        } catch (error: any) {
          console.error('Erro ao atualizar pedido:', error);
          const errorMessage = error.response?.data?.message || 'Verifique os dados e tente novamente.';
          window.alert(`Erro ao atualizar pedido: ${errorMessage}`);
        }
      } else {
        try {
          // Criar novo pedido
          const response = await ordersService.create(apiOrderData);
          console.log('Pedido criado com sucesso!', response);
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        } catch (error: any) {
          console.error('Erro ao criar pedido:', error);
          if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Detalhes do erro:', error.response.data);
          }
          window.alert('Erro ao criar pedido. Verifique os dados e tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao processar dados do pedido:', error);
      window.alert(`Erro ao processar dados do pedido: ${(error as Error).message}`);
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
            Hora do Pedido *
          </label>
          <input
            type="datetime-local"
            name="dateTime"
            required
            value={formData.dateTime.replace(' ', 'T')}
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
            <option value="Transferência">Transferência</option>
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

        {/* Discount, Shipping and Order Total */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-md font-medium text-gray-900 dark:text-white">
              Subtotal:
            </span>
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              R$ {subtotal.toFixed(2)}
            </span>
          </div>
          
          {/* Discount Field */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Desconto (%)
              </label>
              <input
                type="number"
                name="discount"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Shipping Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Frete (R$)
              </label>
              <input
                type="number"
                name="shipping"
                step="0.01"
                min="0"
                value={formData.shipping}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          {/* Discount Amount Display */}
          {discountPercentage > 0 && (
            <div className="flex justify-between items-center text-red-600 dark:text-red-400">
              <span className="text-md font-medium">
                Desconto ({discountPercentage}%):
              </span>
              <span className="text-lg font-medium">
                -R$ {discountAmount.toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Shipping Amount Display */}
          {formData.shipping > 0 && (
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span className="text-md font-medium">
                Frete:
              </span>
              <span className="text-lg font-medium">
                +R$ {Number(formData.shipping).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
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
        
        {/* Botão de salvar que usa a função handleSaveOrder */}
        <button
          type="button"
          onClick={handleSaveOrder}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {order ? 'Salvar Pedido' : 'Criar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default OrderForm;