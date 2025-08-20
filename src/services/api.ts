import axios from 'axios';

<<<<<<< HEAD
// Configuração do axios
// Detectar se está rodando em dispositivo móvel ou rede local
const getBaseURL = () => {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // 1) Variável de ambiente (com proteção para caso esteja apontando para localhost em acesso via LAN)
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined) || undefined;
  if (envUrl) {
    const envIsLocal = /(^|\b)(localhost|127\.0\.0\.1)\b/.test(envUrl);
    // Se estamos no desktop (localhost), pode usar envUrl normalmente
    // Se estamos acessando via IP (mobile/LAN) e envUrl é localhost, ignorar para evitar apontar pro localhost do celular
    if (isLocalHost || !envIsLocal) {
      return envUrl;
    }
  }

  // 2) Em localhost, usar proxy do Vite (/api)
  if (isLocalHost) {
    return '/api';
  }

  // 3) Em acesso via IP da rede local, usar o mesmo IP para a API
  return `http://${host}:3001/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});

// Utilitário: decodifica JWT (base64url)
const decodeJwt = (token: string): any | null => {
  try {
    const part = token.split('.')[1] || '';
    // Converter base64url para base64
    let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    // Preencher com '=' se necessário
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Anexar o tenant para o middleware no backend
  try {
    const tenantSub = localStorage.getItem('tenantSubdomain');
    if (tenantSub) {
      config.headers['X-Tenant-ID'] = tenantSub;
    } else {
      // Fallback: extrair tenantId do JWT enquanto subdomínio não está disponível
      const raw = localStorage.getItem('token');
      if (raw) {
        const payload = decodeJwt(raw) as { tenantId?: string } | null;
        if (payload?.tenantId) {
          config.headers['X-Tenant-ID'] = payload.tenantId;
        }
      }
    }
    // Aviso/bloqueio apenas para rotas que exigem tenant
    if (!config.headers['X-Tenant-ID']) {
      try {
        const host = window.location.hostname;
        // Evitar spam: apenas em dev/local
        if (host === 'localhost' || host === '127.0.0.1') {
          // Tentar identificar o path real (sem baseURL)
          let path = '';
          try {
            const u = new URL((config as any).url, window.location.origin);
            path = u.pathname;
          } catch {
            path = String((config as any).url || '');
          }
          // Paths públicos que não exigem tenant
          const publicPaths = ['/auth/login', '/auth/verify', '/health', '/super-admin'];
          const isPublic = publicPaths.some(p => path.startsWith(p) || path.startsWith(`/api${p}`));
          if (isPublic) {
            return config; // não avisar nem bloquear rotas públicas
          }
          // eslint-disable-next-line no-console
          console.warn('[api] X-Tenant-ID ausente nesta chamada:', config.method?.toUpperCase(), config.url);
          if (!isPublic) {
            try { window.dispatchEvent(new CustomEvent('tenant-missing')); } catch {}
            // Bloqueia a requisição para evitar 400 no backend e orientar o usuário a definir o tenant
            const err: any = new Error('TENANT_REQUIRED: Defina o tenant (localStorage.tenantSubdomain) antes de chamar a API.');
            err.code = 'TENANT_REQUIRED';
            throw err;
          }
        }
      } catch {}
    }
  } catch (_) {
    // ignore
  }
  return config;
});

// Interceptor para tratar erros (com tentativa de refresh de token uma vez)
let refreshPromise: Promise<{ token: string }> | null = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url = originalRequest.url || '';

    // Não tentar refresh no login
    if (status === 401 && url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Evita múltiplos refresh em paralelo: todos aguardam a mesma promise
        if (!refreshPromise) {
          refreshPromise = authService.refresh().finally(() => {
            // libera após conclusão (sucesso ou falha)
            setTimeout(() => { refreshPromise = null; }, 0);
          });
        }
        const refreshed = await refreshPromise;
        if (refreshed?.token) {
          setAuthToken(refreshed.token);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${refreshed.token}`;
          return api(originalRequest);
        }
      } catch (_) {
        // falha no refresh
      }
      setAuthToken(null);
      window.location.href = '/login';
      return Promise.reject(error);
    }

=======
const API_BASE_URL = 'http://localhost:3001/api';

// Criar instância do axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se recebermos 304 Not Modified, não é realmente um erro
    // Significa que podemos usar dados em cache
    if (error.response?.status === 304) {
      console.log('Código 304 recebido: Usando dados em cache');
      // Transformamos o erro 304 em uma resposta bem-sucedida com dados vazios
      // O componente deve verificar se já tem dados e mantê-los
      return Promise.resolve({ 
        data: { data: [] }, 
        status: 304, 
        statusText: 'Not Modified',
        headers: error.response.headers,
        config: error.config
      });
    } else if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return Promise.reject(error);
  }
);

// Tipos TypeScript
export interface User {
<<<<<<< HEAD
  id: string; // Mongo ObjectId
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  status?: 'Ativo' | 'Inativo';
  last_login?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id?: string;
  cpf?: string;
  cnpj?: string;
  id: string | number;
  name: string;
  email?: string;
  phone: string;
  rg?: string;
  ie?: string;
  document: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  district?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  person_type?: 'FISICA' | 'JURIDICA';
=======
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone: string;
  document: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  orders?: number;
  totalValue?: number;
  lastOrder?: string;
<<<<<<< HEAD
  birth_date?: string;
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  code: string;
  ncm?: string;
  cest?: string;
  unit: string;
  cost_price: number;
<<<<<<< HEAD
  sale_price: number;
=======
  price?: number; // O banco de dados usa 'price'
  sale_price: number; // A API do servidor espera 'sale_price'
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  stock: number;
  min_stock: number;
  category?: string;
  status: string;
  created_at: string;
  updated_at: string;
  stockStatus?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  user_id: number;
  order_number: string;
  date: string;
  due_date?: string;
  payment_method: string;
<<<<<<< HEAD
=======
  installments?: number;
  installment_plan?: string;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  user_name?: string;
  items_count?: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total: number;
  product_name?: string;
  product_code?: string;
  unit?: string;
}

export interface Billet {
  id: number;
  customer_id: number;
<<<<<<< HEAD
  order_id?: number;
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  billet_number: string;
  amount: number;
  due_date: string;
  issue_date: string;
  payment_date?: string;
  barcode?: string;
  instructions?: string;
  interest: number;
  fine: number;
  discount: number;
  discount_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
<<<<<<< HEAD
  order_number?: string;
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

export interface Visit {
  id: number;
  customer_id: number;
<<<<<<< HEAD
  user_id: number;
  date: string;
  time: string;
  location: string;
  type: string;
  status: string;
  notes?: string;
  reminder: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  user_name?: string;
}

export interface Notification {
  id: string | number;
  user_id?: string | number;
=======
  customer_name: string;
  user_id: number;
  user_name?: string;
  date: string;
  time: string;
  location?: string;
  type?: string;
  purpose?: string;
  notes?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  _isTemp?: boolean; // Flag para identificar visitas temporárias (não salvas no servidor)
}

export interface Notification {
  id: number;
  user_id?: number;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  type: string;
  title: string;
  message: string;
  read: boolean;
<<<<<<< HEAD
  created_at?: string;
}

// Perfil da Empresa
export interface CompanyProfile {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  ie?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  pixKey?: string;
=======
  created_at: string;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

// Serviços de API

<<<<<<< HEAD
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

export const authService = {
  login: async (email: string, password: string, tenantSubdomain?: string) => {
    const payload: any = { email, password };
    if (tenantSubdomain && tenantSubdomain.trim().length > 0) {
      payload.tenantSubdomain = tenantSubdomain.trim().toLowerCase();
    }
    const response = await api.post('/auth/login', payload);
    const { token } = response.data;
    setAuthToken(token);
    // Persistir tenantSubdomain retornado pelo backend (se houver)
    try {
      const returnedTenant = response.data?.tenantSubdomain;
      if (returnedTenant) {
        localStorage.setItem('tenantSubdomain', String(returnedTenant).toLowerCase());
      } else {
        localStorage.removeItem('tenantSubdomain');
      }
    } catch (_) {}
=======
// Autenticação
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
<<<<<<< HEAD
    // Persistir tenantSubdomain retornado pelo backend (se houver)
    try {
      const returnedTenant = (response.data as any)?.tenantSubdomain;
      if (returnedTenant) {
        localStorage.setItem('tenantSubdomain', String(returnedTenant).toLowerCase());
      }
    } catch {}
    return response.data;
  },

  refresh: async (): Promise<{ token: string }> => {
    const response = await api.post('/auth/refresh');
    const { token } = response.data || {};
    if (token) setAuthToken(token);
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },

  logout: async () => {
<<<<<<< HEAD
    // Apenas limpar credenciais no cliente; o endpoint de logout no backend é opcional
    setAuthToken(null);
    return { message: 'Logout realizado localmente' };
  }
};

export const customersService = {
  getAll: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/customers', { params });
    return response.data.customers;
  },

  getById: async (id: string | number) => {
=======
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Clientes
export const customersService = {
  getAll: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getById: async (id: number) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

<<<<<<< HEAD
  create: async (customer: any) => {
=======
  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.post('/customers', customer);
    return response.data;
  },

<<<<<<< HEAD
  update: async (id: string | number, customer: any) => {
=======
  update: async (id: number, customer: Partial<Customer>) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.put(`/customers/${id}`, customer);
    return response.data;
  },

<<<<<<< HEAD
  delete: async (id: string | number) => {
    const response = await api.delete(`/customers/${id}`);
=======
  delete: async (id: number) => {
    const response = await api.delete(`/orders/${id}`);
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },
};

<<<<<<< HEAD
// Serviço de categorias
export const categoriesService = {
  getAll: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/categories', { params });
    return response.data.categories;
  },
  getById: async (id: string | number) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  create: async (category: any) => {
    const response = await api.post('/categories', category);
    return response.data;
  },
  update: async (id: string | number, category: any) => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },
  delete: async (id: string | number) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
};

export const productsService = {
  getAll: async (params?: any) => {
    const response = await api.get('/products', { params });
    return response.data.products;
  },

  getById: async (id: string | number) => {
=======
// Produtos
export const productsService = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  getById: async (id: number) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

<<<<<<< HEAD
  create: async (product: any) => {
    const response = await api.post('/products', product);
    return response.data;
  },

  update: async (id: string | number, product: any) => {
    const response = await api.put(`/products/${id}`, product);
=======
  create: async (productData: any) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  update: async (id: number, productData: any) => {
    const response = await api.put(`/products/${id}`, productData);
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  import: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/products/import', formData, {
<<<<<<< HEAD
      headers: { 'Content-Type': 'multipart/form-data' }
=======
      headers: { 'Content-Type': 'multipart/form-data' },
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    });
    return response.data;
  },
};

<<<<<<< HEAD
export const ordersService = {
  getAll: async (params?: { search?: string; status?: string; customer_id?: string | number; page?: number; limit?: number }) => {
    const response = await api.get('/orders', { params });
    return response.data.orders;
  },

  getById: async (id: string | number) => {
=======
// Pedidos
export const ordersService = {
  getAll: async (params?: { search?: string; status?: string; customer_id?: number; page?: number; limit?: number }) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  
  resetOrderIds: async () => {
    const response = await api.post('/orders/reset-ids');
    return response.data;
  },

  getById: async (id: number) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

<<<<<<< HEAD
  // Atualização de pedido (pagamentos, status, etc.) com fallback
  update: async (id: string | number, payload: Partial<any>) => {
    try {
      const response = await api.patch(`/orders/${id}`, payload);
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        // Alguns backends podem não suportar PATCH para esta rota
        console.warn('[ordersService.update] PATCH 404, tentando PUT /orders/:id');
        try {
          const response = await api.put(`/orders/${id}`, payload);
          return response.data;
        } catch (err2: any) {
          if (err2?.response?.status === 404) {
            console.warn('[ordersService.update] PUT 404, tentando POST /orders/:id');
            try {
              const response = await api.post(`/orders/${id}`, payload);
              return response.data;
            } catch (err3: any) {
              if (err3?.response?.status === 404) {
                console.warn('[ordersService.update] POST /orders/:id 404, tentando POST /orders/update/:id');
                try {
                  const response = await api.post(`/orders/update/${id}`, payload);
                  return response.data;
                } catch (err4: any) {
                  if (err4?.response?.status === 404) {
                    console.warn('[ordersService.update] POST /orders/update/:id 404, tentando POST /orders com id no corpo');
                    const response = await api.post(`/orders`, { id, ...payload });
                    return response.data;
                  }
                  throw err4;
                }
              }
              throw err3;
            }
          }
          throw err2;
        }
      }
      throw err;
    }
  },

  create: async (order: {
    customer_id: string;
=======
  create: async (order: {
    customer_id: number;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    date: string;
    due_date?: string;
    payment_method: string;
    items: Array<{
<<<<<<< HEAD
      product_id: string;
=======
      product_id: number;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
    discount?: number;
  }) => {
    const response = await api.post('/orders', order);
    return response.data;
  },

<<<<<<< HEAD
=======
  update: async (id: number, order: {
    customer_id?: number;
    date?: string;
    due_date?: string;
    payment_method?: string;
    items?: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
    discount?: number;
  }) => {
    console.log(`Atualizando pedido ${id} com dados:`, JSON.stringify(order));
    try {
      // Como o endpoint PUT /orders/${id} não existe, vamos tentar uma abordagem alternativa
      // Primeiro, vamos deletar o pedido existente
      console.log(`Deletando pedido ${id} para recriar em seguida`);
      await api.delete(`/orders/${id}`);
      
      // Agora, criar um novo pedido com os mesmos dados atualizados
      // Garantindo que todos os campos obrigatórios estão presentes
      const cleanOrder = {
        customer_id: order.customer_id,
        date: order.date || new Date().toISOString().split('T')[0],
        payment_method: order.payment_method || 'Boleto',
        due_date: order.due_date,
        notes: order.notes,
        items: order.items || []
      };
      
      console.log('Recriando pedido com dados:', JSON.stringify(cleanOrder));
      const response = await api.post('/orders', cleanOrder);
      console.log('Pedido recriado com sucesso:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado na atualização:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados do erro:', error.response.data);
      }
      throw error; // Repassar o erro para tratamento no componente
    }
  },

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};

<<<<<<< HEAD

export const visitsService = {
  getAll: async (params?: { date?: string; user_id?: number; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/visits', { params });
    return response.data.visits;
  },

  getById: async (id: number) => {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  },

  create: async (visit: {
    customer_id: string;
    date: string;
    time: string;
    location: string;
    type: string;
    notes?: string;
    reminder?: number;
  }) => {
    const response = await api.post('/visits', visit);
    return response.data;
  },

  update: async (id: number, visit: Partial<Visit>) => {
    const response = await api.put(`/visits/${id}`, visit);
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/visits/${id}/status`, { status });
=======
// Boletos
export const billetsService = {
  getAll: async (params?: { search?: string; status?: string; customer_id?: number; page?: number; limit?: number }) => {
    const response = await api.get('/billets', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/billets/${id}`);
    return response.data;
  },

  create: async (billet: {
    customer_id: number;
    amount: number;
    due_date: string;
    instructions?: string;
    interest?: number;
    fine?: number;
    discount?: number;
    discount_date?: string;
  }) => {
    console.log('Criando novo boleto com dados:', billet);
    const response = await api.post('/billets', billet);
    return response.data;
  },
  
  update: async (id: number, billet: {
    customer_id?: number;
    amount?: number;
    due_date?: string;
    instructions?: string;
    interest?: number;
    fine?: number;
    discount?: number;
    discount_date?: string;
  }) => {
    console.log(`Atualizando boleto ${id} com dados:`, billet);
    try {
      // Remover propriedades undefined ou null antes de enviar
      const cleanBillet = JSON.parse(JSON.stringify(billet));
      const response = await api.put(`/billets/${id}`, cleanBillet);
      return response.data;
    } catch (error: any) {
      // Se o endpoint PUT não existir, tenta a abordagem alternativa
      if (error.response?.status === 404) {
        console.log('Endpoint PUT para boletos não encontrado, usando abordagem alternativa');
        // Obter dados atuais do boleto
        const currentBillet = await billetsService.getById(id);
        // Cancelar o boleto atual
        await billetsService.cancel(id);
        // Limpar dados para nova criação
        const cleanBillet = JSON.parse(JSON.stringify(billet));
        // Criar um novo boleto com os dados atualizados
        const newBilletData = {
          ...currentBillet,
          ...cleanBillet,
          // Garantir que os campos obrigatórios estejam presentes
          customer_id: billet.customer_id || currentBillet.customer_id,
          amount: billet.amount || currentBillet.amount,
          due_date: billet.due_date || currentBillet.due_date
        };
        delete newBilletData.id; // Remover o ID para criar um novo
        return await billetsService.create(newBilletData);
      }
      throw error; // Se não for 404, propagar o erro original
    }
  },

  registerPayment: async (id: number, payment_date: string, amount_paid?: number) => {
    const response = await api.patch(`/billets/${id}/payment`, { payment_date, amount_paid });
    return response.data;
  },

  cancel: async (id: number) => {
    const response = await api.patch(`/billets/${id}/cancel`);
    return response.data;
  },
};

// Usuários
export const usersService = {
  getAll: async (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (user: {
    name: string;
    email: string;
    password: string;
    role: string;
    permissions: string[];
  }) => {
    const response = await api.post('/users', user);
    return response.data;
  },

  update: async (id: number, user: Partial<User>) => {
    const response = await api.put(`/users/${id}`, user);
    return response.data;
  },

  changePassword: async (id: number, currentPassword?: string, newPassword?: string) => {
    const response = await api.patch(`/users/${id}/password`, { currentPassword, newPassword });
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },

  delete: async (id: number) => {
<<<<<<< HEAD
    const response = await api.delete(`/visits/${id}`);
=======
    const response = await api.delete(`/users/${id}`);
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    return response.data;
  },
};

<<<<<<< HEAD
// usersService removido: UI de Usuários foi desativada e permissões eliminadas

export const dashboardService = {
  // period can be: 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all'
  getStats: async (period?: string) => {
    const params = period ? { period } : undefined;
    const response = await api.get('/dashboard', { params });
    return response.data;
  },
=======
// Dashboard
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  getSalesReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/sales-report', {
      params: { startDate, endDate },
    });
<<<<<<< HEAD
    return response.data as Array<{ _id: string; sales: number; orders: number }>;
  },
=======
    return response.data;
  },

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  getCustomersReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/customers-report', {
      params: { startDate, endDate },
    });
<<<<<<< HEAD
    return response.data as Array<{ _id: string; newCustomers: number }>;
  },
  getProductsReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/products-report', {
      params: { startDate, endDate },
    });
    return response.data as {
      topProducts: Array<{ product_id: string; name?: string; code?: string; quantity: number; sales: number }>;
      byDay: Array<{ _id: string; items: number; sales: number }>;
    };
  },
  getFinancialReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/financial-report', {
      params: { startDate, endDate },
    });
    return response.data as {
      byDueDate: Array<{ _id: string; total_amount: number; paid_amount: number; overdue_amount: number; count: number }>;
      summary: { total_amount: number; paid_amount: number; overdue_amount: number; installments: number };
    };
  },
};

export const notificationsService = {
  // Retorna { notifications, pagination }
  getAll: async (params?: { page?: number; limit?: number; unread_only?: boolean; read_only?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data as {
      notifications: any[];
      pagination: { page: number; limit: number; total: number; pages: number };
    };
  },

  // Conveniência: obter total de não lidas
  getUnreadCount: async () => {
    const response = await api.get('/notifications', { params: { unread_only: true, page: 1, limit: 1 } });
    return Number(response.data?.pagination?.total || 0);
  },

  markAsRead: async (id: string | number) => {
=======
    return response.data;
  },
  
  getOrdersByStatus: async () => {
    try {
      // Obter todos os pedidos
      const response = await api.get('/orders');
      const orders = response.data;
      
      // Contar pedidos por status
      const statusCounts: Record<string, number> = {};
      
      // Processar os dados e contar pedidos por status
      if (orders && Array.isArray(orders)) {
        orders.forEach((order: any) => {
          const status = order.status || 'Desconhecido';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
      }
      
      // Converter para formato de array para mais fácil exibição
      const result = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
      
      return result;
    } catch (error) {
      console.error('Erro ao obter estatísticas de pedidos por status:', error);
      return [];
    }
  },
};

// Serviço de visitas
export const visitsService = {
  getAll: async () => {
    try {
      console.log('Buscando todas as visitas');
      const response = await api.get('/visits');
      console.log('Visitas recebidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar visitas:', error.message);
      throw error;
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/visits/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Erro ao buscar visita ${id}:`, error.message);
      throw error;
    }
  },

  create: async (visit: any) => {
    try {
      // Ajustamos os dados aqui para garantir o formato correto
      // que o servidor espera
      const visitData = {
        customer_id: Number(visit.customer_id),
        date: visit.date,
        time: visit.time,
        location: visit.location || 'Empresa',
        type: visit.type || 'Visita',
        notes: visit.notes || '',
        reminder: visit.reminder || 30
      };
      
      console.log('Enviando para API:', JSON.stringify(visitData));
      const response = await api.post('/visits', visitData);
      console.log('Resposta da API:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar visita:', error.message);
      console.error('Detalhes:', error.response?.data);
      throw error;
    }
  },

  update: async (id: number, visit: any) => {
    try {
      // Ajustamos os dados aqui para garantir o formato correto
      // que o servidor espera
      const visitData = {
        ...(visit.customer_id ? { customer_id: Number(visit.customer_id) } : {}),
        ...(visit.date ? { date: visit.date } : {}),
        ...(visit.time ? { time: visit.time } : {}),
        ...(visit.location ? { location: visit.location } : { location: 'Empresa' }),
        ...(visit.type ? { type: visit.type } : { type: 'Visita' }),
        ...(visit.notes !== undefined ? { notes: visit.notes } : {}),
        ...(visit.reminder ? { reminder: Number(visit.reminder) } : { reminder: 30 }),
        ...(visit.status ? { status: visit.status } : {})
      };
      
      console.log(`Atualizando visita ${id}:`, JSON.stringify(visitData));
      const response = await api.put(`/visits/${id}`, visitData);
      console.log('Resposta da API:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Erro ao atualizar visita ${id}:`, error.message);
      console.error('Detalhes:', error.response?.data);
      throw error;
    }
  },

  updateStatus: async (id: number, status: string) => {
    try {
      console.log(`Atualizando status da visita ${id} para ${status}`);
      const response = await api.patch(`/visits/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error(`Erro ao atualizar status da visita ${id}:`, error.message);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      console.log(`Excluindo visita ${id}`);
      await api.delete(`/visits/${id}`);
      return true;
    } catch (error: any) {
      console.error(`Erro ao excluir visita ${id}:`, error.message);
      throw error;
    }
  }
};

// Notificações
export const notificationsService = {
  getAll: async (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id: number) => {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

<<<<<<< HEAD
  // Remover notificações lidas
  deleteRead: async () => {
    const response = await api.delete('/notifications/read');
    return response.data as { deleted: number };
  },

  create: async (notification: {
    user_id?: string | number;
    type: 'success' | 'warning' | 'error' | 'info';
=======
  create: async (notification: {
    user_id?: number;
    type: string;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    title: string;
    message: string;
  }) => {
    const response = await api.post('/notifications', notification);
    return response.data;
  },
};

<<<<<<< HEAD
export const companyService = {
  storageKey: 'companyProfile',
  apiFlagKey: 'companyProfileApiAvailable',
  _apiAvailable: undefined as undefined | boolean,

  getProfile: async (): Promise<CompanyProfile> => {
    // 1) Retorna imediatamente o cache local (UX mais rápido)
    const cachedRaw = localStorage.getItem('companyProfile');
    const cached: CompanyProfile = cachedRaw ? (JSON.parse(cachedRaw) as CompanyProfile) : {};

    // 2) Verifica flag de disponibilidade da API (evita 404 repetidos)
    if (typeof companyService._apiAvailable === 'undefined') {
      const flag = localStorage.getItem(companyService.apiFlagKey);
      companyService._apiAvailable = flag !== 'false';
    }

    if (!companyService._apiAvailable) {
      return cached;
    }

    // 3) Tenta atualizar em background; se falhar com 404, desativa chamadas futuras
    try {
      // debug: marca tentativa de GET
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[companyService.getProfile] Fetching /company/profile');
      }
    } catch {}
    try {
      const res = await api.get('/company/profile');
      const data = (res.data || {}) as CompanyProfile;
      try {
        const isEditing = (() => { try { return (window as any)?.__bpEditingCompanyProfile === true; } catch { return false; } })();
        if (isEditing) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[companyService.getProfile] Skipped caching companyProfile due to active editing flag');
          }
        } else {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[companyService.getProfile] Caching companyProfile to localStorage', { data });
          }
          localStorage.setItem('companyProfile', JSON.stringify(data));
        }
      } catch (e) { console.warn('[companyService] Failed to cache profile', e); }
      try { localStorage.setItem(companyService.apiFlagKey, 'true'); } catch {}
      companyService._apiAvailable = true;
      return Object.keys(cached).length ? cached : data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        try { localStorage.setItem(companyService.apiFlagKey, 'false'); } catch {}
        companyService._apiAvailable = false;
      }
      return cached;
    }
  },

  saveProfile: async (profile: CompanyProfile): Promise<CompanyProfile> => {
    // If user is actively editing and explicit allow flag isn't set, skip saving entirely
    try {
      const isEditing = (window as any)?.__bpEditingCompanyProfile === true;
      const allow = (window as any)?.__bpAllowSaveCompanyProfile === true;
      if (isEditing && !allow) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[companyService.saveProfile] Blocked save due to active editing without allow flag');
        }
        return profile;
      }
    } catch {}

    // Atualiza cache local antes (UX otimista)
    try {
      const isEditing = (() => { try { return (window as any)?.__bpEditingCompanyProfile === true; } catch { return false; } })();
      if (isEditing) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[companyService.saveProfile] Skipped pre-caching due to active editing flag', { stack: new Error().stack });
        }
      } else {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[companyService.saveProfile] Pre-caching companyProfile to localStorage', { profile, stack: new Error().stack });
        }
        localStorage.setItem('companyProfile', JSON.stringify(profile));
      }
    } catch (e) { console.warn('[companyService] Failed to pre-cache profile', e); }
    if (typeof companyService._apiAvailable === 'undefined') {
      const flag = localStorage.getItem(companyService.apiFlagKey);
      companyService._apiAvailable = flag !== 'false';
    }

    // Sempre tentar salvar no servidor ao clicar em Salvar.
    // Se der 404, marcamos flag e seguimos local-only.
    try {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[companyService.saveProfile] PUT /company/profile', { profile });
      }
      const res = await api.put('/company/profile', profile);
      const data = (res.data || profile) as CompanyProfile;
      try {
        const isEditing = (() => { try { return (window as any)?.__bpEditingCompanyProfile === true; } catch { return false; } })();
        if (isEditing) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[companyService.saveProfile] Skipped caching response due to active editing flag');
          }
        } else {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[companyService.saveProfile] Caching server response to localStorage', { data });
          }
          localStorage.setItem('companyProfile', JSON.stringify(data));
        }
      } catch (e) { console.warn('[companyService] Failed to cache profile', e); }
      try { localStorage.setItem(companyService.apiFlagKey, 'true'); } catch {}
      companyService._apiAvailable = true;
      return data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        try { localStorage.setItem(companyService.apiFlagKey, 'false'); } catch {}
        companyService._apiAvailable = false;
      }
      // Sem backend: mantém apenas local
      return profile;
    }
  },
};

// Serviço de perfil do usuário atual
export const meService = {
  get: async () => {
    const res = await api.get('/me');
    return res.data as User & { avatarUrl?: string };
  },
  update: async (payload: { name?: string; avatarUrl?: string }) => {
    const res = await api.put('/me', payload);
    return res.data as User & { avatarUrl?: string };
  },
  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const res = await api.put('/me/password', payload);
    return res.data as { message: string };
  },
  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await api.put('/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data as { message: string; avatarUrl: string };
  }
};

=======
// Backup
export const backupService = {
  create: async () => {
    const response = await api.post('/backup');
    return response.data;
  },

  list: async () => {
    const response = await api.get('/backups');
    return response.data;
  },
};

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
export default api;