import { api } from './api';

// Serviço de categorias
export const categoriesService = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  create: async (categoryName: string) => {
    const response = await api.post('/categories', { name: categoryName });
    return response.data;
  }
};
