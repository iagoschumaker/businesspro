import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { nowLocal, ymdFromDate, addDaysLocal, formatBRFromYMD, toAPIDateTimeLocal, formatBRFlexible } from '../../utils/date';
import { customersService, productsService, ordersService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { generateOrderPDF, OrderPDFData } from '../../utils/pdfGenerator';



// Helper function to format currency
const formatCurrency = (value: number | string) => {
  // Converter para número e tratar valores inválidos
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Se não for um número válido, retorna R$ 0,00
  if (isNaN(numValue) || !isFinite(numValue)) {
    return 'R$ 0,00';
  }
  
  // Arredondar para 2 casas decimais
  const roundedValue = Math.round(numValue * 100) / 100;
  
  // Retornar valor formatado
  return roundedValue.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Use centralized date helpers from utils/date


interface TimeoutRefs {
  customer: number | null;
  product: number | null;
  [key: `product-${number}`]: number | null;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  code?: string;
  description?: string;
  sale_price?: number;
}

interface OrderItem {
  id: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  stock: number;
  exceedsStock: boolean;
}

interface Installment {
  number: number;
  amount: number;
  due_date: string;
  status: string;
}

interface OrderPayload {
  customer_id: string;
  items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  payment_method: string;
  installments?: number;
  installment_interval?: number;
  discount?: number;
  shipping?: number;
  status: string;
  installment_details?: Installment[];
  date: string;
  due_date: string;
  notes?: string;
  total: number;
  // Base64 data URL da assinatura do cliente (opcional)
  signatureImage?: string;
}

interface OrderFormProps {
  onClose: () => void;
  onSave: () => void;
  customerId?: number;
  editOrderData?: any;
  viewMode?: 'create' | 'view' | 'edit';
}

const OrderForm: React.FC<OrderFormProps> = ({
  onClose,
  onSave,
  customerId,
  editOrderData,
  viewMode = 'create'
}) => {
  const isViewMode = viewMode === 'view'; // Form is read-only only in 'view' mode

  // State for form data
  const [formData, setFormData] = useState(() => {
    const today = nowLocal();
    const todayStr = ymdFromDate(today);
    // Default due date should match order date (no +7 offset)
    const dueDateStr = todayStr;
    
    return {
      customerId: customerId ? String(customerId) : '',
      customerName: '',
      date: todayStr,
      paymentMethod: 'Dinheiro' as 'Dinheiro' | 'Cartão de Crédito' | 'Boleto' | 'PIX' | 'Promissória',
      dueDate: dueDateStr,
      notes: '',
      discountPercent: 0,
      shippingValue: 0,
      installments: 1,
      installmentInterval: 30
    };
  });
  
  // State to track which item is being edited (index or null if none)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // State for order items and UI
  const [items, setItems] = useState<OrderItem[]>([]);
  // Local string state for quantity inputs to allow empty while typing
  const [quantityInputs, setQuantityInputs] = useState<string[]>([]);

  // Keep quantityInputs aligned with items length and seed from item quantities
  useEffect(() => {
    setQuantityInputs(prev => items.map((it, idx) => prev[idx] ?? String(it.quantity)));
  }, [items]);
  
  // Process order items with product data
  const processOrderItems = (items: any[], products: Product[]): OrderItem[] => {
    if (!Array.isArray(items)) {
      console.log('Nenhum item encontrado no pedido - items não é um array');
      return [];
    }
    
    return items.map((item) => {
      const unitPrice = Number(item.unit_price || item.unitPrice || 0);
      const quantity = Number(item.quantity || 0);
      const total = Math.round(unitPrice * quantity * 100) / 100;
      const product = products.find((p: Product) => p.id === (item.product_id || item.productId));
      const productName = product ? product.name : (item.product?.name || 'Produto não encontrado');
      const stock = product ? product.stock : (item.product?.stock || 0);
      
      return {
        id: item.id || Math.random(),
        productId: String(item.product_id || item.productId || ''),
        productName,
        quantity,
        unitPrice,
        total,
        stock,
        exceedsStock: quantity > stock
      };
    });
  };
  const [hasStockIssues, setHasStockIssues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  
  // Update installments when payment method, installments, or other relevant data changes
  useEffect(() => {
    if (formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito') {
      try {
        const newInstallments = generateInstallments(
          formData.date,
          items,
          formData.discountPercent || 0,
          formData.shippingValue || 0,
          formData.installments || 1,
          formData.installmentInterval || 30,
          formData.dueDate || undefined
        );
        console.log('Atualizando parcelas no estado:', newInstallments);
        setInstallments(newInstallments);
      } catch (error) {
        console.error('Erro ao gerar parcelas:', error);
        setInstallments([]);
      }
    } else {
      setInstallments([]);
    }
  }, [formData.paymentMethod, formData.installments, formData.installmentInterval, formData.date, formData.discountPercent, formData.shippingValue, items]);
  
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isAddingFirstItem, setIsAddingFirstItem] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  // Customer signature image (base64 data URL)
  const [signatureImage, setSignatureImage] = useState<string>('');
  // Signature pad refs/state
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasSignatureRef = useRef(false);

  // Signature helpers
  const getCanvasCtx = () => {
    const canvas = sigCanvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };
  const getPos = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isViewMode) return;
    const canvas = sigCanvasRef.current;
    const ctx = getCanvasCtx();
    if (!canvas || !ctx) return;
    canvas.setPointerCapture?.(e.pointerId);
    isDrawingRef.current = true;
    hasSignatureRef.current = true;
    const p = getPos(e);
    lastPointRef.current = p;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827'; // gray-900
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = getCanvasCtx();
    if (!ctx || !lastPointRef.current) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };
  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    // Cache current image
    const canvas = sigCanvasRef.current;
    if (canvas) setSignatureImage(canvas.toDataURL('image/png'));
  };
  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = getCanvasCtx();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignatureRef.current = false;
      setSignatureImage('');
    }
  };
  // Initialize canvas size (fixed pixel size, responsive CSS)
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    // Use high-res backing store for sharper lines
    canvas.width = 600; // pixels
    canvas.height = 240; // pixels
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);
  
  
  
  // Refs
  const searchTimeoutRef = useRef<TimeoutRefs>({
    customer: null,
    product: null
  });
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  
  // Create a map of products for quick lookup (commented out as not currently used)
  // const productMap = useMemo(() => {
  //   const map = new Map<number, Product>();
  //   products.forEach(product => map.set(product.id, product));
  //   return map;
  // }, [products]);

  // Removed loadInitialData since we're now handling data loading directly in the main effect
  
  // Efeito para buscar produtos com debounce
  useEffect(() => {
    let isMounted = true;
    
    const searchProducts = async (searchTerm: string) => {
      try {
        setIsLoadingProducts(true);
        const searchResults = await productsService.getAll({ 
          search: searchTerm.trim(),
          limit: 10
        });
        
        if (isMounted) {
          setFilteredProducts(searchResults);
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        if (isMounted) {
          toast.error('Não foi possível carregar os produtos. Tente novamente.');
          setFilteredProducts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };
    
    // Se a busca estiver vazia, limpa os resultados
    if (!productSearch.trim()) {
      setFilteredProducts([]);
      return () => {
        isMounted = false;
      };
    }
    
    // Limpar timeout anterior
    if (searchTimeoutRef.current.product) {
      clearTimeout(searchTimeoutRef.current.product);
    }
    
    // Configurar novo timeout
    searchTimeoutRef.current.product = window.setTimeout(() => {
      searchProducts(productSearch);
    }, 500);
    
    return () => {
      isMounted = false;
      if (searchTimeoutRef.current.product) {
        clearTimeout(searchTimeoutRef.current.product);
      }
    };
  }, [productSearch]); // Removida a dependência de showError

  // Efeito para filtrar clientes com base na busca
  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter((customer: Customer) => 
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (customer.phone && customer.phone.includes(customerSearch))
    );
    
    console.log('Filtered customers:', filtered);
    setFilteredCustomers(filtered);
  }, [customerSearch, customers]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        console.log('Loading order data...');
        setCustomersLoading(true);
        
        // Load customers
        const customersData = await customersService.getAll();
        
        if (!isMounted) return;
        
        console.log('Customers loaded:', customersData);
        console.log('Number of customers:', customersData?.length || 0);
        if (customersData?.length > 0) {
          console.log('First customer structure:', customersData[0]);
        }
        
        // Update customers state
        setCustomers(customersData);
        setFilteredCustomers(customersData);

        // If customerId is provided and we're creating a new order, pre-select the customer
        if (customerId && !editOrderData) {
          console.log('Pre-selecting customer with ID:', customerId);
          const customer = customersData.find((c: Customer) => 
            (c as any)._id === customerId || (c as any).id === customerId || String((c as any)._id) === String(customerId)
          );
          if (customer) {
            console.log('Found customer:', customer);
            const customerIdToUse = (customer as any)._id || (customer as any).id;
            setFormData(prev => ({
              ...prev,
              customerId: String(customerIdToUse),
              customerName: customer.name
            }));
            setCustomerSearch(customer.name);
          } else {
            console.warn('Customer not found with ID:', customerId);
          }
        }
        // Load existing order data if in edit or view mode
        else if (editOrderData) {
          console.log(`${viewMode === 'view' ? 'Visualizando' : 'Editando'} pedido existente:`, editOrderData);
          
          const order = editOrderData;
          const customer = customersData.find((c: Customer) => 
            (c as any)._id === order.customer_id || (c as any).id === order.customer_id || 
            String((c as any)._id) === String(order.customer_id)
          );
          
          if (customer) {
            console.log('Customer found:', customer);
            
            const installments = order.installments || 1;
            const installmentInterval = order.installment_interval || 30;
            
            // Process order items if they exist
            let orderItems: OrderItem[] = [];
            if (order.items && Array.isArray(order.items)) {
              // Load products for existing order items
              const productIds = order.items.map((item: any) => item.product_id || item.productId);
              const productsData = await Promise.all(
                productIds.map((id: number) => 
                  productsService.getById(id).catch(() => null)
                )
              );
              
              const validProducts = productsData.filter(Boolean) as Product[];
              orderItems = processOrderItems(order.items, validProducts);
              console.log('Processed order items:', orderItems);
              
              // Se existem itens, não estamos mais no modo de adicionar o primeiro item
              if (isMounted) {
                setIsAddingFirstItem(false);
              }
            }
            
            const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
            const discountAmount = Number(order.discount) || 0;
            const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
            
            // Prepare all state updates
            const updates = {
              formData: {
                customerId: String(order.customer_id || ''),
                customerName: customer.name || '',
                // Format dates as YYYY-MM-DD for input fields
                date: order.date ? order.date : ymdFromDate(nowLocal()),
                dueDate: order.due_date ? order.due_date : ymdFromDate(addDaysLocal(nowLocal(), 7)),
                paymentMethod: (order.payment_method as 'Dinheiro' | 'Cartão de Crédito' | 'Boleto' | 'PIX' | 'Promissória') || 'Dinheiro',
                notes: order.notes || '',
                discountPercent: discountPercent,
                shippingValue: Number(order.shipping) || 0,
                installments: installments,
                installmentInterval: installmentInterval
              },
              customerSearch: customer.name,
              items: orderItems,
              filteredCustomers: customersData,
              installments: [] as Installment[]
            };
            
            // Handle installments for Boleto payments
            if (order.payment_method === 'Boleto' && (order.installment_details?.length > 0 || installments > 0)) {
              if (order.installment_details?.length > 0) {
                // Use existing installment details if available
                updates.installments = order.installment_details.map((detail: any) => ({
                  number: detail.number,
                  amount: Number(detail.amount),
                  // Normalize to 'YYYY-MM-DD' for UI and calculations
                  due_date: typeof detail.due_date === 'string' && detail.due_date.includes('T')
                    ? detail.due_date.slice(0, 10)
                    : detail.due_date,
                  status: detail.status || 'pending'
                }));
                console.log('Loaded existing installments:', updates.installments);
              } else if (installments > 0) {
                // Generate installments if not available but should be
                updates.installments = generateInstallments(
                  order.date || ymdFromDate(nowLocal()),
                  order.items,
                  order.discount || 0,
                  order.shipping || 0,
                  installments,
                  installmentInterval,
                  (typeof (order.due_date || order.dueDate) === 'string' && (order.due_date || order.dueDate).includes('T'))
                    ? (order.due_date || order.dueDate).slice(0, 10)
                    : (order.due_date || order.dueDate)
                );
                console.log('Generated installments:', updates.installments);
              }
              
              // Ensure form data has correct installments and interval
              updates.formData.installments = installments;
              updates.formData.installmentInterval = installmentInterval;
            }
            
            // Apply all state updates in a single batch
            if (isMounted) {
              setFormData(prev => ({
                ...prev,
                ...updates.formData
              }));
              setCustomerSearch(updates.customerSearch);
              setItems(updates.items);
              setFilteredCustomers(updates.filteredCustomers);
              setInstallments(updates.installments);
              
              console.log('All order data loaded and states updated');
            console.log('Form date values:', {
              rawDate: order.date,
              formattedDate: formatBRFlexible(order.date),
              formDataDate: formData.date,
              rawDueDate: order.due_date,
              formattedDueDate: order.due_date ? formatBRFlexible(order.due_date) : 'N/A',
              formDataDueDate: formData.dueDate
            });
            }
          }
        } else {
          // For new orders, just set the default filtered customers
          if (isMounted) {
            setFilteredCustomers(customersData);
          }
        }
      } catch (error) {
        console.error('Error loading order data:', error);
        toast.error('Erro ao carregar dados do pedido. Tente novamente.');
      } finally {
        if (isMounted) {
          setCustomersLoading(false);
          setIsLoadingProducts(false);
        }
      }
    };

    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [editOrderData, customerId, viewMode]); // Removed loadInitialData, customers.length, products.length from deps
  


  // Helper function to generate installments
  const generateInstallments = (
    orderDate: string,
    items: any[],
    discountAbsolute: number, // desconto em valor absoluto
    shipping: number,
    installments: number,
    interval: number,
    firstDueDate?: string // nova data inicial opcional
  ): Installment[] => {
    const generatedInstallments: Installment[] = [];

    // Parse the order date, ensuring we handle it in local time
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, (month || 1) - 1, day || 1);
    };

    // Format date as YYYY-MM-DD in local time
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      const startDate = parseLocalDate(orderDate);
      if (isNaN(startDate.getTime())) {
        console.error('Invalid order date:', orderDate);
        return [];
      }

      const subtotal = items.reduce((sum: number, item: any) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
        return sum + quantity * unitPrice;
      }, 0);

      // Desconto absoluto
      const total = Math.max(0, subtotal - (Number(discountAbsolute) || 0) + (Number(shipping) || 0));
      const installmentAmount = total / Math.max(1, installments || 1);

      // Primeira parcela: usar firstDueDate se fornecida, caso contrário orderDate + interval
      const firstInstallmentDate = firstDueDate
        ? parseLocalDate(firstDueDate)
        : new Date(startDate);
      if (!firstDueDate) {
        firstInstallmentDate.setDate(firstInstallmentDate.getDate() + (interval || 30));
      }

      let runningTotal = 0;
      const count = Math.max(1, installments || 1);
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(firstInstallmentDate);
        if (i > 0) {
          dueDate.setDate(firstInstallmentDate.getDate() + i * (interval || 30));
        }

        let amount = 0;
        if (i === count - 1) {
          amount = Math.round((total - runningTotal) * 100) / 100;
        } else {
          amount = Math.round(installmentAmount * 100) / 100;
          runningTotal += amount;
        }

        generatedInstallments.push({
          number: i + 1,
          amount,
          due_date: formatLocalDate(dueDate),
          status: 'pending',
        });
      }

      return generatedInstallments;
    } catch (error) {
      console.error('Error generating installments:', error);
      return [];
    }
  };

  // Generate installment details for Boleto or Cartão de Crédito payments
  const generateInstallmentDetails = useCallback((): Installment[] => {
    // Se não for boleto nem cartão de crédito, retorna array vazio
    if (formData.paymentMethod !== 'Boleto' && formData.paymentMethod !== 'Cartão de Crédito') {
      console.log('Método de pagamento não suporta parcelamento, retornando array vazio');
      return [];
    }
    
    // Garante que teremos pelo menos 1 parcela
    const installmentsCount = Math.max(1, formData.installments || 1);
    console.log(`Gerando ${installmentsCount} parcelas para pagamento via Boleto`);

    const installments: Installment[] = [];
    
    // Calculate subtotal, discount, and total consistently with orderTotals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const discountAmount = (subtotal * (Number(formData.discountPercent) || 0)) / 100;
    const shipping = Number(formData.shippingValue) || 0;
    const total = Math.max(0, subtotal - discountAmount + shipping);
    
    // Já definimos o installmentsCount no início da função
    const installmentAmount = total / installmentsCount;
    
    // Parse the order date, ensuring we handle it in local time
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      // Note: month is 0-indexed in JavaScript Date
      return new Date(year, month - 1, day);
    };
    
    // Format date as YYYY-MM-DD in local time
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Usar a data de vencimento fornecida, se disponível, ou a data do pedido + intervalo
    const firstInstallmentDate = formData.dueDate 
      ? parseLocalDate(formData.dueDate)
      : (() => {
          const date = parseLocalDate(formData.date);
          date.setDate(date.getDate() + (formData.installmentInterval || 30));
          return date;
        })();
    
    let runningTotal = 0;

    for (let i = 0; i < installmentsCount; i++) {
      // Create a new date object for each installment to avoid reference issues
      const dueDate = new Date(firstInstallmentDate);
      // Add the interval days (i * interval) to the first installment date
      // For the first installment (i=0), this will be 0 days from firstInstallmentDate
      dueDate.setDate(firstInstallmentDate.getDate() + (i * (formData.installmentInterval || 30)));
      
      // For the last installment, adjust to compensate for any rounding differences
      let amount = 0;
      if (i === installmentsCount - 1) {
        amount = Math.round((total - runningTotal) * 100) / 100;
      } else {
        amount = Math.round(installmentAmount * 100) / 100;
        runningTotal += amount;
      }
      
      // Format the date in YYYY-MM-DD format in local time
      const formattedDueDate = formatLocalDate(dueDate);
      
      installments.push({
        number: i + 1,
        amount: amount,
        due_date: formattedDueDate,
        status: 'pending'
      });
    }

    return installments;
  }, [formData.paymentMethod, formData.installments, formData.installmentInterval, formData.date, formData.shippingValue, formData.discountPercent, items]);

  // Calculate order totals
  const orderTotals = useMemo(() => {
    try {
      // Calculate subtotal by summing (quantity * price) for each item
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);
      
      // Calculate discount amount based on subtotal
      const discountAmount = (subtotal * (formData.discountPercent / 100)) || 0;
      
      // Calculate shipping
      const shipping = Number(formData.shippingValue) || 0;
      
      // Calculate total
      const total = Math.max(0, subtotal - discountAmount + shipping);
      
      // Helper function to round money values
      const roundMoney = (value: number) => {
        // Round to 2 decimal places and convert to number
        return Number(value.toFixed(2));
      };
      
      // Return values rounded to 2 decimal places
      return { 
        subtotal: roundMoney(subtotal), 
        discount: roundMoney(discountAmount), 
        total: roundMoney(total),
        shipping: roundMoney(shipping)
      };
    } catch (error) {
      console.error('Error calculating order totals:', error);
      // Return default values in case of error
      return { 
        subtotal: 0, 
        discount: 0, 
        total: 0,
        shipping: 0
      };
    }
  }, [items, formData.discountPercent, formData.shippingValue]);

  // For view mode, use the values from editOrderData if available
  const displayTotals = useMemo(() => {
    if (isViewMode && editOrderData) {
      return {
        subtotal: Number(editOrderData.subtotal) || 0,
        discount: Number(editOrderData.discount) || 0,
        shipping: Number(editOrderData.shipping) || 0,
        total: Number(editOrderData.total) || 0
      };
    }
    return orderTotals;
  }, [isViewMode, editOrderData, orderTotals]);

  // Destructure for easier access
  const { subtotal, discount, total, shipping: _shipping } = displayTotals;

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current.customer) {
      clearTimeout(searchTimeoutRef.current.customer);
    }
    
    // Set new timeout
    searchTimeoutRef.current.customer = window.setTimeout(() => {
      if (!customerSearch.trim()) {
        setFilteredCustomers([]);
        return;
      }
      
      const searchTerm = customerSearch.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm) ||
        (customer.email?.toLowerCase().includes(searchTerm) ?? false) ||
        (customer.phone?.includes(customerSearch) ?? false)
      );
      setFilteredCustomers(filtered);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current.customer) {
        clearTimeout(searchTimeoutRef.current.customer);
      }
    };
  }, [customerSearch, customers]);

  // Carrega clientes e produtos quando o componente é montado
  useEffect(() => {
    const loadData = async () => {
      try {
        setCustomersLoading(true);
        
        // Carrega clientes e produtos em paralelo
        const [customersData, productsData] = await Promise.all([
          customersService.getAll(),
          productsService.getAll()
        ]);
        
        setCustomers(customersData);
        setFilteredCustomers(customersData);

        // Se não houver dados de pedido para edição, saia
        if (editOrderData) {
          const order = editOrderData;
          const customer = customersData.find((c: Customer) => c.id === order.customer_id);
          
          // Processa os itens do pedido com os produtos carregados
          if (order.items && Array.isArray(order.items)) {
            const orderItems = processOrderItems(order.items, productsData);
            console.log('Processed order items:', orderItems);
            setItems(orderItems);
          }
          
          if (customer) {
            const installments = order.installments || 1;
            const installmentInterval = order.installment_interval || 30;
            
            setFormData(prev => ({
              ...prev,
              customerId: String(customer.id),
              customerName: customer.name,
              date: order.date || ymdFromDate(nowLocal()),
              dueDate: order.due_date || ymdFromDate(addDaysLocal(nowLocal(), 7)),
              paymentMethod: order.payment_method || 'Dinheiro',
              notes: order.notes || '',
              // Calcula o percentual de desconto baseado no valor absoluto do desconto e no subtotal
              // Garantir que o cálculo funcione mesmo quando shipping for undefined ou null
              discountPercent: order.discount ? (Number(order.discount) / (Number(order.total) + Number(order.discount) - (Number(order.shipping) || 0))) * 100 : 0,
              shippingValue: Number(order.shipping) || 0,
              installments: installments,
              installmentInterval: installmentInterval
            }));
            
            // Se houver parcelas salvas, carregá-las
            if (order.installment_details && order.installment_details.length > 0) {
              setInstallments(order.installment_details);
            } else if (order.payment_method === 'Boleto' && installments > 1) {
              // Se não houver parcelas salvas mas deveria ter, gerá-las
              const generatedInstallments = [];
              const startDate = new Date(order.date || new Date());
              
              // Calcular o total considerando desconto e frete
              const subtotal = order.items.reduce((sum: number, item: any) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unit_price) || 0;
                return sum + (quantity * unitPrice);
              }, 0);
              
              const discountAmount = Number(order.discount) || 0;
              const shipping = Number(order.shipping) || 0;
              const total = Math.max(0, subtotal - discountAmount + shipping);
              
              // Calcular valor de cada parcela
              const installmentAmount = total / installments;
              let runningTotal = 0;
              
              for (let i = 0; i < installments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setDate(startDate.getDate() + (i * installmentInterval));
                
                // Para a última parcela, ajustar para compensar eventuais diferenças de arredondamento
                let amount = 0;
                if (i === installments - 1) {
                  amount = Math.round((total - runningTotal) * 100) / 100;
                } else {
                  amount = Math.round(installmentAmount * 100) / 100;
                  runningTotal += amount;
                }
                
                generatedInstallments.push({
                  number: i + 1,
                  amount: amount,
                  due_date: ymdFromDate(dueDate),
                  status: 'pending'
                });
              }
              
              setInstallments(generatedInstallments);
            }
            
            // Items are already processed and set above
            
            setCustomerSearch(customer.name);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setCustomersLoading(false);
      }
    };

    loadData();
  }, [editOrderData]);

  // Update installments when payment method or installments change
  useEffect(() => {
    if ((formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito') && formData.installments > 1) {
      const installmentDetails = generateInstallmentDetails();
      setInstallments(installmentDetails);
    } else {
      setInstallments([]);
    }
  }, [formData.paymentMethod, formData.installments, formData.installmentInterval, generateInstallmentDetails]);


  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for date fields to prevent timezone shifts
    if ((name === 'date' || name === 'dueDate') && value) {
      // For date inputs, the value is already in YYYY-MM-DD format
      // We'll store it as is to prevent timezone conversion
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      return;
    }
    
    // Apply uppercase to textual fields only
    const transformedValue = ['notes'].includes(name) ? value.toLocaleUpperCase() : value;
    setFormData(prev => ({
      ...prev,
      [name]: transformedValue
    }));
  };
  
  // Atualiza o estoque de um produto no servidor
  const updateProductStock = async (productId: number, quantityChange: number) => {
    try {
      console.log(`Atualizando estoque do produto ${productId} com alteração de ${quantityChange}`);
      
      // Busca o produto atual para obter o estoque atual
      const product = await productsService.getById(productId);
      
      // Calcula o novo valor de estoque
      const newStock = Math.max(0, (product.stock || 0) - quantityChange);
      
      // Atualiza o produto com o novo estoque
      await productsService.update(productId, { 
        ...product,
        stock: newStock 
      });
      
      console.log(`Estoque do produto ${productId} atualizado para ${newStock}`);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar o estoque:', error);
      return false;
    }
  };

  // Função para adicionar um novo item ao pedido
  const handleAddItem = async (e: React.MouseEvent<HTMLButtonElement> | null, productId?: string) => {
    e?.preventDefault();
    try {
      // Se não houver productId, adiciona um item vazio
      if (!productId) {
        const newEmptyItem: OrderItem = {
          id: Date.now(),
          productId: '',
          productName: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          stock: 0,
          exceedsStock: false
        };
        
        setItems([...items, newEmptyItem]);
        setIsAddingFirstItem(false);
        return;
      }

      // Validar se productId é válido (número ou ObjectId do MongoDB)
      const isNumericId = !isNaN(Number(productId)) && Number(productId) > 0;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(productId);
      
      if (!isNumericId && !isMongoId) {
        console.error('ID do produto inválido:', productId);
        toast.error('ID do produto inválido. Tente selecionar o produto novamente.');
        return;
      }

      // Buscar os detalhes reais do produto
      // Se for numérico, converte para número; senão, mantém como string (MongoDB ObjectId)
      const productIdForApi = isNumericId ? Number(productId) : productId;
      const product = await productsService.getById(productIdForApi);
      
      const newItem = {
        id: Date.now(), // Usando timestamp como ID temporário
        productId: String(product.id),
        productName: product.name,
        quantity: 1,
        unitPrice: product.sale_price || 0,
        total: product.sale_price || 0,
        stock: product.stock || 0,
        exceedsStock: 1 > (product.stock || 0) // Verifica se a quantidade (1) excede o estoque
      };

      setItems(prevItems => {
        const updatedItems = [...prevItems, newItem];
        // Verifica se há problemas de estoque
        const hasStockProblems = updatedItems.some(item => item.exceedsStock);
        setHasStockIssues(hasStockProblems);
        
        // Se era o primeiro item, desativa o modo de adição do primeiro item
        if (isAddingFirstItem) {
          setIsAddingFirstItem(false);
        }
        
        return updatedItems;
      });

      // Limpa a busca após adicionar o item
      setProductSearch('');
      setShowProductDropdown(false);
      
      // Define o índice do item recém-adicionado para edição
      setEditingItemIndex(items.length);
      
      // Usa um pequeno timeout para garantir que o DOM foi atualizado
      setTimeout(() => {
        const inputIndex = items.length; // Índice do novo item
        const inputElement = document.querySelector(`input[data-item-index="${inputIndex}"][name="quantity"]`) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Não foi possível adicionar o item. Tente novamente.');
    }
  };

  // Handle item quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      // Update quantity and recalculate total
      item.quantity = Math.max(1, newQuantity); // Ensure quantity is at least 1
      item.total = Math.round(item.quantity * item.unitPrice * 100) / 100;
      
      // Check stock - only mark as exceeds if increasing quantity
      // Allow reducing quantity even if stock is insufficient
      item.exceedsStock = item.quantity > item.stock;
      
      updatedItems[index] = item;
      
      // Check if any items exceed stock
      const hasStockProblems = updatedItems.some(i => i.exceedsStock);
      setHasStockIssues(hasStockProblems);
      
      return updatedItems;
    });
  };
  
  // Handle item price change
  const handlePriceChange = (index: number, newPrice: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      // Update price and recalculate total
      item.unitPrice = Math.max(0, newPrice); // Ensure price is not negative
      item.total = Math.round(item.quantity * item.unitPrice * 100) / 100;
      
      updatedItems[index] = item;
      return updatedItems;
    });
  };
  
  // Update installments when payment method or installments change
  useEffect(() => {
    if ((formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito') && formData.installments > 1) {
      const installmentDetails = generateInstallmentDetails();
      setInstallments(installmentDetails);
    } else {
      setInstallments([]);
    }
  }, [formData.paymentMethod, formData.installments, formData.installmentInterval, generateInstallmentDetails]);

  // Remove item function - used in the JSX for removing order items
  const removeItem = useCallback((idOrIndex: number | string) => {
    setItems(prevItems => {
      const newItems = typeof idOrIndex === 'number' 
        ? [...prevItems.slice(0, idOrIndex), ...prevItems.slice(idOrIndex + 1)]
        : prevItems.filter(item => item.id !== Number(idOrIndex));
      
      // Recheck stock issues after removal using the new items array
      const hasStockProblems = newItems.some(item => item.exceedsStock);
      setHasStockIssues(hasStockProblems);
      
      return newItems;
    });
  }, []);



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== HANDLESUBMIT CHAMADO ===');
    console.log('isSubmitting:', isSubmitting);
    console.log('hasStockIssues:', hasStockIssues);
    console.log('formData.customerId:', formData.customerId);
    console.log('items.length:', items.length);
    
    if (isSubmitting) {
      console.log('Bloqueado: já está enviando');
      return; // Prevent multiple submissions
    }
    
    if (hasStockIssues) {
      console.log('Bloqueado: problemas de estoque');
      toast.error('Não é possível finalizar o pedido com produtos que excedem o estoque disponível.');
      return;
    }
    
    if (!formData.customerId) {
      console.log('Bloqueado: cliente não selecionado');
      toast.error('Por favor, selecione um cliente.');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido.');
      return;
    }
    
    setIsSubmitting(true); // Start submission

    // Ensure dates are in the correct format for submission
    const now = nowLocal();
    
    // Format dates for submission, adjusting for timezone
    const submissionDate = formData.date
      ? formData.date
      : ymdFromDate(now);
    
    // Default due date should be the same day as the order date
    const submissionDueDate = formData.dueDate
      ? formData.dueDate
      : submissionDate;

    // Use the latest calculated totals
    const { discount: calculatedDiscount, total: calculatedTotal } = orderTotals;

    // Verifica se é um pagamento parcelado (Boleto ou Cartão de Crédito)
    const isInstallmentPayment = formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito';
    const numInstallments = formData.installments || 1;
    
    let installmentPayload = {};
    let formattedInstallments: Installment[] = [];
    
    if (isInstallmentPayment) {
      // Gerar as parcelas
      const generatedInstallments = generateInstallments(
        formData.date || submissionDate,
        items,
        calculatedDiscount || 0,
        formData.shippingValue || 0,
        numInstallments,
        formData.installmentInterval || 30,
        submissionDueDate
      );
      
      console.log('Parcelas geradas:', JSON.stringify(generatedInstallments, null, 2));
      
      // Formatar as parcelas para o payload da API
      // Importante: enviar due_date como 'YYYY-MM-DD' (string pura) para evitar timezone no backend
      formattedInstallments = generatedInstallments.map((installment: Installment) => ({
        number: Number(installment.number),
        amount: Number(Number(installment.amount).toFixed(2)),
        due_date: installment.due_date,
        status: 'pending',
        payment_method: formData.paymentMethod
      }));
      
      // Criar o payload de parcelas
      installmentPayload = {
        installments: Number(numInstallments),
        installment_interval: formData.installmentInterval ? Number(formData.installmentInterval) : 30,
        installment_details: formattedInstallments
      };
      
      console.log('Payload das parcelas:', JSON.stringify(installmentPayload, null, 2));
    }
    
    console.log('=== DETALHES DAS PARCELAS ===');
    console.log('Método de pagamento:', formData.paymentMethod);
    console.log('Número de parcelas:', numInstallments);
    console.log('Intervalo entre parcelas:', formData.installmentInterval || 30);
    console.log('Parcelas formatadas:', JSON.stringify(formattedInstallments, null, 2));

    // Compose order date including current local time and timezone offset
    // Use the selected date (YYYY-MM-DD) and merge with current local time
    const [yStr, mStr, dStr] = submissionDate.split('-');
    const dateWithTime = new Date(
      Number(yStr),
      Number(mStr) - 1,
      Number(dStr),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
    const dateWithTimeLocal = toAPIDateTimeLocal(dateWithTime);

    // Due date for API: send plain 'YYYY-MM-DD' to avoid timezone shifts on backend
    const dueYMD = submissionDueDate;
    console.log('submissionDate:', submissionDate, 'submissionDueDate:', submissionDueDate);

    // For non-installment payments, also persist a single installment so due_date is saved consistently
    let singleInstallmentForNonParcel: any = {};
    if (!isInstallmentPayment) {
      singleInstallmentForNonParcel = {
        installments: 1,
        installment_details: [
          {
            number: 1,
            amount: Number(Number(calculatedTotal).toFixed(2)),
            // Send as 'YYYY-MM-DD'
            due_date: dueYMD,
            status: 'pending',
            payment_method: formData.paymentMethod,
          },
        ],
      };
    }

    // Create the order payload with all required fields
    const payload: OrderPayload = {
      customer_id: String(formData.customerId),
      // Send date with local time.
      date: dateWithTimeLocal,
      // Send due_date as 'YYYY-MM-DD' to avoid timezone issues
      due_date: dueYMD,
      payment_method: formData.paymentMethod,
      items: items.map(item => ({
        product_id: String(item.productId),
        quantity: item.quantity,
        unit_price: item.unitPrice
      })),
      total: calculatedTotal,
      ...(formData.notes && { notes: formData.notes }),
      ...(calculatedDiscount > 0 && { discount: calculatedDiscount }),
      ...(formData.shippingValue > 0 && { shipping: Number(formData.shippingValue) }),
      ...(isInstallmentPayment && {
        installments: Number(numInstallments),
        installment_interval: formData.installmentInterval ? Number(formData.installmentInterval) : 30,
        installment_details: formattedInstallments
      }),
      ...singleInstallmentForNonParcel,
      // Persist latest signature image if available
      ...( (() => {
        const sigData = signatureImage || (sigCanvasRef.current && hasSignatureRef.current ? sigCanvasRef.current.toDataURL('image/png') : '');
        return sigData ? { signatureImage: sigData } as Partial<OrderPayload> : {};
      })() ),
    };

    console.log('=== PAYLOAD COMPLETO ===');
    console.log(JSON.stringify(payload, null, 2));

    try {
      if (editOrderData) {
        console.log('Editando pedido existente, verificando alterações no estoque...');
        
        // Busca o pedido original para comparar as quantidades
        const response = await ordersService.getById(editOrderData.id);
        const originalOrder = response.data || response; // Adapta para diferentes formatos de resposta
        let originalItems = [];
        
        // Tenta obter os itens de diferentes formatos de resposta
        if (Array.isArray(originalOrder.items)) {
          originalItems = originalOrder.items;
        } else if (originalOrder.order_items) {
          originalItems = originalOrder.order_items;
        } else if (originalOrder.data?.items) {
          originalItems = originalOrder.data.items;
        }
        
        console.log('Pedido original:', originalOrder);
        console.log('Itens do pedido original:', originalItems);
        
        // Cria um mapa dos itens originais para fácil acesso
        const originalItemsMap = new Map();
        for (const originalItem of originalItems) {
          if (!originalItem) continue;
          const productId = originalItem.product_id || originalItem.productId;
          originalItemsMap.set(Number(productId), originalItem.quantity || 0);
        }
        
        // 1. Primeiro, verifica se há estoque suficiente para os itens atualizados
        for (const item of items) {
          const originalQuantity = originalItemsMap.get(Number(item.productId)) || 0;
          const quantityChange = item.quantity - originalQuantity;
          
          if (quantityChange > 0) {
            const product = await productsService.getById(Number(item.productId));
            // Verifica se tem estoque suficiente para o aumento
            if (product.stock < quantityChange) {
              throw new Error(`Estoque insuficiente para o produto: ${item.productName}. Estoque disponível: ${product.stock}, quantidade adicional solicitada: ${quantityChange}`);
            }
          }
        }
        
        // 2. Atualiza o estoque em uma única operação atômica para cada produto
        const stockUpdates = [];
        
        // Para cada item no pedido original que não está mais no novo pedido, devolve ao estoque
        for (const [productId, originalQty] of originalItemsMap.entries()) {
          const newItem = items.find(item => Number(item.productId) === productId);
          if (!newItem) {
            // Item foi removido, devolve todo o estoque
            stockUpdates.push(updateProductStock(Number(productId), originalQty));
          } else if (newItem.quantity < originalQty) {
            // Quantidade foi reduzida, devolve a diferença
            const difference = originalQty - newItem.quantity;
            stockUpdates.push(updateProductStock(Number(productId), difference));
          }
        }
        
        // Para cada item no novo pedido, remove a quantidade se for maior que o original
        for (const item of items) {
          const originalQty = originalItemsMap.get(Number(item.productId)) || 0;
          if (item.quantity > originalQty) {
            const difference = item.quantity - originalQty;
            stockUpdates.push(updateProductStock(Number(item.productId), -difference));
          }
        }
        
        // Aguarda todas as atualizações de estoque serem concluídas
        const results = await Promise.all(stockUpdates);
        if (results.some(success => !success)) {
          throw new Error('Falha ao atualizar o estoque de um ou mais produtos');
        }
        
        // Atualiza o estoque exibido no formulário
        for (const item of items) {
          const updatedProduct = await productsService.getById(Number(item.productId));
          setItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.productId === item.productId ? { ...prevItem, stock: updatedProduct.stock } : prevItem
            )
          );
        }
        
        // Atualiza o pedido após ajustar os estoques
        await (ordersService as any).update(editOrderData.id, payload);
        toast.success('Pedido atualizado com sucesso!');
      } else {
        // Código para novo pedido...
        console.log('Iniciando processo de atualização de estoque para novo pedido...');
        
        // Verifica se há estoque suficiente para todos os itens (opcional para testes)
        const SKIP_STOCK_VALIDATION = true; // Mude para false para ativar validação
        
        if (!SKIP_STOCK_VALIDATION) {
          for (const item of items) {
            // Validar e converter productId (pode ser número ou ObjectId do MongoDB)
            const isNumericId = !isNaN(Number(item.productId)) && Number(item.productId) > 0;
            const productIdForApi = isNumericId ? Number(item.productId) : item.productId;
            
            console.log('Verificando estoque para produto ID:', productIdForApi);
            const product = await productsService.getById(productIdForApi);
            if (product.stock < item.quantity) {
              throw new Error(`Estoque insuficiente para o produto: ${item.productName}. Estoque disponível: ${product.stock}, quantidade solicitada: ${item.quantity}`);
            }
          }
        } else {
          console.log('Validação de estoque desabilitada para testes');
        }
        
        // TODO: Implementar atualização de estoque quando o backend suportar
        console.log('Atualização de estoque será implementada no backend');
        
        // Atualiza o estoque para cada item do pedido (comentado até implementar no backend)
        // for (const item of items) {
        //   console.log(`Atualizando estoque para o produto ${item.productId}...`);
        //   // Implementar quando o backend tiver endpoint para atualizar estoque
        // }
        
        // Se chegou até aqui, o estoque foi atualizado com sucesso
        console.log('Criando pedido...');
        const createdOrder = await ordersService.create(payload);
        console.log('Pedido criado com sucesso:', createdOrder);
        toast.success('Pedido criado com sucesso!');
      }
      onClose();
      onSave();
    } catch (error: any) {
      console.error('Error saving order:', error);
      
      // Mostrar detalhes do erro do backend
      if (error.response?.data) {
        console.error('Backend error details:', error.response.data);
        const backendMessage = error.response.data.message || error.response.data.error || 'Erro desconhecido';
        toast.error(`Erro do servidor: ${backendMessage}`);
      } else {
        toast.error('Ocorreu um erro ao salvar o pedido. Por favor, tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
      setIsLoadingProducts(false);
    }
  };

  // Gera um PDF de orçamento a partir do estado atual do formulário, sem salvar no backend
  const handleGenerateQuotePDF = async () => {
    try {
      if (!formData.customerId || !formData.customerName) {
        toast.error('Selecione um cliente para gerar o orçamento.');
        return;
      }
      if (!items || items.length === 0) {
        toast.error('Adicione ao menos um item para gerar o orçamento.');
        return;
      }
      setIsGeneratingQuote(true);

      // Tenta obter o objeto completo do cliente; se não, usa apenas o nome
      const customerObj = customers.find(
        (c: any) => String((c as any).id ?? (c as any)._id) === String(formData.customerId)
      );

      // Captura a assinatura mais recente (canvas tem prioridade)
      const sigData = signatureImage || (sigCanvasRef.current && hasSignatureRef.current ? sigCanvasRef.current.toDataURL('image/png') : '');

      const pdfData: OrderPDFData = {
        id: 'orcamento',
        customer: customerObj ? customerObj : { name: formData.customerName },
        date: formData.date,
        createdAt: new Date().toISOString(),
        dueDate: formData.dueDate,
        paymentMethod: formData.paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
        subtotal,
        discount,
        shipping: Number(formData.shippingValue) || 0,
        total,
        notes: formData.notes,
        installment_details:
          (formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito') && installments.length > 0
            ? installments.map((inst) => ({ number: inst.number, amount: inst.amount, due_date: inst.due_date }))
            : [],
        // Pass signature to PDF generator (not persisted ainda)
        signatureImage: sigData || undefined,
      };

      await generateOrderPDF(pdfData);
      toast.success('Orçamento gerado com sucesso.');
    } catch (err) {
      console.error('Erro ao gerar orçamento (PDF):', err);
      toast.error('Não foi possível gerar o orçamento.');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Field */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="customer">Cliente</label>
          <div className="relative">
            <input
              type="text"
              id="customer"
              name="customer"
              className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'cursor-not-allowed' : ''}`}
              value={formData.customerName || customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              disabled={isViewMode}
              placeholder="Pesquisar cliente..."
              autoComplete="off"
            />
            {customersLoading && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 dark:border-gray-300"></div>
              </div>
            )}
            {showCustomerDropdown && !isViewMode && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, idx) => (
                    <div
                      key={`${(customer as any)?.id ?? (customer as any)?._id ?? customer.name ?? 'customer'}-${idx}`}
                      className="px-4 py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onMouseDown={() => {
                        // Obter o ID do cliente (pode ser id ou _id)
                        const customerId = (customer as any)?.id || (customer as any)?._id;
                        console.log('Cliente selecionado:', customer);
                        console.log('ID do cliente:', customerId);
                        
                        setFormData(prev => ({
                          ...prev,
                          customerId: customerId ? String(customerId) : '',
                          customerName: (customer as any).name
                        }));
                        setCustomerSearch((customer as any).name);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      {(customer as any).name}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date and Due Date Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="date">Data</label>
            <input
              type="date"
              id="date"
              name="date"
              className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}`}
              value={formData.date}
              onChange={handleFormChange}
              disabled={isViewMode}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="dueDate">Data de Vencimento</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'cursor-not-allowed' : ''}`}
              value={formData.dueDate}
              onChange={handleFormChange}
              disabled={isViewMode}
              required
            />
          </div>
        </div>
        
        {/* Payment Method */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="paymentMethod">Forma de Pagamento</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'cursor-not-allowed' : ''}`}
            value={formData.paymentMethod}
            onChange={handleFormChange}
            disabled={isViewMode}
            required
          >
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Boleto">Boleto</option>
            <option value="PIX">PIX</option>
            <option value="Promissória">Promissória</option>
          </select>
        </div>

        {/* Campos adicionais para opções de pagamento parcelado */}
        {(formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito' || formData.paymentMethod === 'Promissória') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="installments">Parcelas</label>
              <select
                id="installments"
                name="installments"
                className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'cursor-not-allowed' : ''}`}
                value={formData.installments}
                onChange={handleFormChange}
                disabled={isViewMode}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}x</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="installmentInterval">Intervalo entre Parcelas</label>
              <select
                id="installmentInterval"
                name="installmentInterval"
                className={`w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 ${isViewMode ? 'cursor-not-allowed' : ''}`}
                value={formData.installmentInterval}
                onChange={handleFormChange}
                disabled={isViewMode}
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={45}>45 dias</option>
                <option value={60}>60 dias</option>
              </select>
            </div>
          </div>
        )}

        {/* Order Items Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Itens do Pedido</h3>
          </div>
          
          {/* Campo de seleção de produto para o primeiro item */}
          {!isViewMode && (items.length === 0 || isAddingFirstItem) && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isAddingFirstItem ? 'Adicionar mais itens' : 'Adicionar itens ao pedido'}
                </h4>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Selecione um produto
                </label>
                <div className="relative">
                  <input
                    ref={productSearchInputRef}
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10"
                    placeholder="Buscar produto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                    disabled={isLoadingProducts}
                  />
                  {isLoadingProducts && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                {showProductDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingProducts ? (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Carregando produtos...
                      </div>
                    ) : filteredProducts.length === 0 && !productSearch.trim() ? (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Nenhum produto disponível.
                      </div>
                    ) : null}

                    
                    {/* Lista de produtos filtrados */}
                    {filteredProducts.map((product, idx) => (
                      <div
                        key={`${product.id ?? (product as any)?._id ?? product.code ?? 'product'}-${idx}`}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer"
                        onMouseDown={() => {
                          // Validar se o produto tem um ID válido
                          const productId = product.id || (product as any)._id;
                          if (productId) {
                            handleAddItem(null, String(productId));
                            setProductSearch('');
                            setShowProductDropdown(false);
                          } else {
                            console.error('Produto sem ID válido:', product);
                            toast.error('Produto inválido. Tente novamente.');
                          }
                        }}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Código: {product.code || 'N/A'} | 
                          Preço: {formatCurrency(product.sale_price || product.price || 0)} | 
                          Estoque: {product.stock}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Botão para adicionar novo item */}
          {!isViewMode && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // Ativa o modo de adicionar primeiro item para mostrar o campo de busca
                  setIsAddingFirstItem(true);
                  
                  // Se não houver itens, adiciona um item vazio
                  if (items.length === 0) {
                    const newItem: OrderItem = {
                      id: Date.now(),
                      productId: '',
                      productName: '',
                      quantity: 1,
                      unitPrice: 0,
                      total: 0,
                      stock: 0,
                      exceedsStock: false
                    };
                    setItems([newItem]);
                  }
                  
                  // Foca no campo de busca após a atualização do estado
                  setTimeout(() => {
                    productSearchInputRef.current?.focus();
                  }, 100);
                }}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                + Adicionar Item
              </button>
            </div>
          )}
          
          {items.length > 0 ? (
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm overflow-x-auto border border-gray-100 dark:border-gray-600">
              <div className="divide-y divide-gray-200 dark:divide-gray-600 min-w-[600px] sm:min-w-0">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-800 dark:text-white">
                            {item.productName}
                            {item.exceedsStock && (
                              <span className="ml-2 text-red-500 text-sm">(Estoque insuficiente)</span>
                            )}
                          </h4>
                          <div className="text-sm font-medium text-gray-800 dark:text-white">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                        
                        {editingItemIndex === index ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantidade</label>
                              <input
                                type="number"
                                onWheel={e => (e.target as HTMLInputElement).blur()}
                                min="1"
                                name="quantity"
                                data-item-index={index}
                                value={quantityInputs[index] ?? String(item.quantity)}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuantityInputs(prev => {
                                    const arr = [...prev];
                                    arr[index] = val;
                                    return arr;
                                  });
                                }}
                                onBlur={(e) => {
                                  const n = parseInt(e.target.value, 10);
                                  const finalQty = isNaN(n) || n < 1 ? 1 : n;
                                  handleQuantityChange(index, finalQty);
                                  setQuantityInputs(prev => {
                                    const arr = [...prev];
                                    arr[index] = String(finalQty);
                                    return arr;
                                  });
                                }}
                                className="w-full p-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                ref={el => quantityInputRefs.current[index] = el}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Preço Unitário</label>
                              <input
                                type="number"
                                onWheel={e => (e.target as HTMLInputElement).blur()}
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Estoque: {item.stock}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isViewMode && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                            title="Remover item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">Nenhum item adicionado ao pedido</p>
            </div>
          )}
        </div>
      
        {/* Resumo de valores */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm mb-4">
            {/* Subtotal */}
            <div className="flex justify-between py-1 dark:text-white">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {/* Desconto e Frete lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1 dark:text-white">
              {/* Desconto */}
              <div className="flex flex-col">
                <label htmlFor="discountPercent" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Desconto ({formData.discountPercent}%)
                </label>
                <div className="flex items-stretch rounded-md shadow-sm">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      onWheel={e => (e.target as HTMLInputElement).blur()}
                      id="discountPercent"
                      name="discountPercent"
                      className={`block w-full rounded-l-md border-0 py-1.5 ${
                        isViewMode ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'
                      } px-3 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6`}
                      value={formData.discountPercent}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          discountPercent: isNaN(value) ? 0 : Math.min(100, Math.max(0, value))
                        }));
                      }}
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={isViewMode}
                      placeholder="0,0"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 px-3 text-gray-500 dark:text-gray-400 sm:text-sm bg-gray-50 dark:bg-gray-700">
                    {formData.discountPercent > 0 ? `-${formatCurrency(discount)}` : 'R$ 0,00'}
                  </span>
                </div>
              </div>
              
              {/* Frete */}
              <div className="flex flex-col">
                <label htmlFor="shippingValue" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Frete
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    onWheel={e => (e.target as HTMLInputElement).blur()}
                    id="shippingValue"
                    name="shippingValue"
                    className={`block w-full rounded-md border-0 py-1.5 ${
                      isViewMode ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'
                    } pl-10 pr-3 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6`}
                    value={formData.shippingValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        shippingValue: isNaN(value) ? 0 : Math.max(0, value)
                      }));
                    }}
                    min="0"
                    step="0.01"
                    disabled={isViewMode}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            
            {/* Total */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <span className="text-lg font-semibold text-gray-800 dark:text-white">Total:</span>
              <span className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(total)}</span>
            </div>
          </div>
          
          {/* Seção de parcelas */}
          {(formData.paymentMethod === 'Boleto' || formData.paymentMethod === 'Cartão de Crédito') && installments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">
                {formData.installments > 1 ? 'Parcelas' : 'Parcela Única'}
              </h3>
              <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4">
                <div className="space-y-2">
                  {installments.map((installment) => (
                    <div key={installment.number} className="flex justify-between text-gray-700 dark:text-gray-200">
                      <span>
                        {formData.installments > 1 
                          ? `${installment.number}ª parcela (${formatBRFromYMD(installment.due_date)}):` 
                          : `Vencimento: ${formatBRFromYMD(installment.due_date)}`}
                      </span>
                      <span>{formatCurrency(installment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Campo de observações */}
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="notes">Observações</label>
            <textarea
              id="notes"
              name="notes"
              className={`w-full p-2 border ${isViewMode ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'} border-gray-300 rounded min-h-[80px] dark:text-white dark:border-gray-600`}
              value={formData.notes}
              onChange={handleFormChange}
              disabled={isViewMode}
            />
          </div>

          {/* Assinatura do cliente (desenhar no touch/cursor) */}
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-200 mb-2" htmlFor="signaturePad">Assinatura do cliente (desenhe abaixo)</label>
            <div className="flex flex-col gap-2">
              <div className="relative w-full max-w-md">
                <canvas
                  id="signaturePad"
                  ref={sigCanvasRef}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                  className={`w-full h-24 sm:h-32 border border-dashed rounded bg-white dark:bg-gray-50 ${isViewMode ? 'opacity-60 cursor-not-allowed' : 'touch-none'}`}
                  style={{ touchAction: 'none' as any }}
                />
              </div>
              <div className="flex items-center gap-3">
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Limpar assinatura
                  </button>
                )}
                {signatureImage && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Assinatura capturada</span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">A assinatura será inserida automaticamente no PDF.</p>
          </div>

          
          {/* Botões de ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancelar
            </button>
            <>
              <button
                type="button"
                onClick={handleGenerateQuotePDF}
                disabled={isGeneratingQuote || isSubmitting || items.length === 0 || !formData.customerId}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors ${
                  isGeneratingQuote || isSubmitting || items.length === 0 || !formData.customerId
                    ? 'bg-emerald-500/70 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title={!formData.customerId ? 'Selecione um cliente para gerar o orçamento' : undefined}
              >
                {isGeneratingQuote ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                  </span>
                ) : (
                  <span>Gerar Orçamento (PDF)</span>
                )}
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={hasStockIssues || isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${hasStockIssues ? 'bg-red-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editOrderData ? 'Atualizando...' : 'Criando...'}
                    </span>
                  ) : (
                    <span>{editOrderData ? 'Atualizar Pedido' : 'Criar Pedido'}</span>
                  )}
                </button>
              )}
            </>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
