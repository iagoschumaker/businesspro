import axios from 'axios';

// Base URL compatível com desktop (localhost) e mobile/LAN
const getBaseURL = () => {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  const envUrl = (import.meta.env.VITE_API_URL as string | undefined) || undefined;
  if (envUrl) {
    const envIsLocal = /(^|\b)(localhost|127\.0\.0\.1)\b/.test(envUrl);
    if (isLocalHost || !envIsLocal) {
      return envUrl;
    }
  }

  if (isLocalHost) {
    return '/api';
  }

  return `http://${host}:3001/api`;
};

// Configurar axios para incluir token automaticamente
const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const superAdminApi = {
  // Dashboard
  getDashboard: () => apiClient.get('/super-admin/dashboard').then(res => res.data),
  
  // Tenants
  getTenants: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient.get(`/super-admin/tenants${queryString}`).then(res => res.data);
  },
  
  createTenant: (data: any) => apiClient.post('/super-admin/tenants', data).then(res => res.data),
  
  getTenant: (id: string) => apiClient.get(`/super-admin/tenants/${id}`).then(res => res.data),
  
  updateTenant: (id: string, data: any) => apiClient.put(`/super-admin/tenants/${id}`, data).then(res => res.data),
  
  updateTenantStatus: (id: string, status: string) => 
    apiClient.patch(`/super-admin/tenants/${id}/status`, { status }).then(res => res.data),
  
  deleteTenant: (id: string) => apiClient.delete(`/super-admin/tenants/${id}`).then(res => res.data),
  
  getTenantUsers: (id: string) => apiClient.get(`/super-admin/tenants/${id}/users`).then(res => res.data),
  
  // Plans
  getPlans: () => apiClient.get('/super-admin/plans').then(res => res.data),
  
  createPlan: (data: any) => apiClient.post('/super-admin/plans', data).then(res => res.data),
  
  // Auth
  registerSimple: (data: any) => apiClient.post('/auth/register-simple', data).then(res => res.data),
};
