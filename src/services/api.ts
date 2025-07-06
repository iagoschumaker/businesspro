import axios from 'axios';

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
    return Promise.reject(error);
  }
);

// Tipos TypeScript
export interface User {
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
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  orders?: number;
  totalValue?: number;
  lastOrder?: string;
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
  price?: number; // O banco de dados usa 'price'
  sale_price: number; // A API do servidor espera 'sale_price'
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
  order_id?: number;
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
  order_number?: string;
}

export interface Visit {
  id: number;
  customer_id: number;
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
  id: number;
  user_id?: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Serviços de API

// Autenticação
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  logout: async () => {
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
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    const response = await api.post('/customers', customer);
    return response.data;
  },

  update: async (id: number, customer: Partial<Customer>) => {
    const response = await api.put(`/customers/${id}`, customer);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },
};

// Produtos
export const productsService = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (productData: any) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  update: async (id: number, productData: any) => {
    const response = await api.put(`/products/${id}`, productData);
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
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Pedidos
export const ordersService = {
  getAll: async (params?: { search?: string; status?: string; customer_id?: number; page?: number; limit?: number }) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (order: {
    customer_id: number;
    date: string;
    due_date?: string;
    payment_method: string;
    items: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
    discount?: number;
  }) => {
    const response = await api.post('/orders', order);
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};

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
    order_id?: number;
    amount: number;
    due_date: string;
    instructions?: string;
    interest?: number;
    fine?: number;
    discount?: number;
    discount_date?: string;
  }) => {
    const response = await api.post('/billets', billet);
    return response.data;
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

// Visitas
export const visitsService = {
  getAll: async (params?: { date?: string; user_id?: number; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/visits', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  },

  create: async (visit: {
    customer_id: number;
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
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/visits/${id}`);
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
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Dashboard
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getSalesReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/sales-report', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getCustomersReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/dashboard/customers-report', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// Notificações
export const notificationsService = {
  getAll: async (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  create: async (notification: {
    user_id?: number;
    type: string;
    title: string;
    message: string;
  }) => {
    const response = await api.post('/notifications', notification);
    return response.data;
  },
};

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

export default api;