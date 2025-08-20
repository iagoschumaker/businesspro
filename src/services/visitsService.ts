import api from './api';

export interface Visit {
  // Backend pode retornar tanto `id` quanto `_id` (Mongo)
  id?: string | number;
  _id?: string;
  // Pode vir populado como objeto ou apenas o id
  customer_id: string | number | { name?: string; [k: string]: any };
  customer_name?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes: string;
  reminder: number; // minutos
  status: 'Agendado' | 'Confirmado' | 'Pendente' | 'Concluído' | 'Cancelado';
  created_at?: string;
  updated_at?: string;
  [k: string]: any; // tolerância a campos adicionais
}

export interface CreateVisitData {
  customer_id: string; // MongoDB ObjectId as string
  date: string;
  time: string;
  notes: string;
  reminder: number;
  status: string;
}

export const visitsService = {
  async getAll(params?: { date?: string; status?: string; user_id?: string | number; page?: number; limit?: number; }): Promise<Visit[]> {
    const response = await api.get('/visits', { params });
    return response.data.visits || response.data;
  },

  async getById(id: number | string): Promise<Visit> {
    const response = await api.get(`/visits/${id}`);
    return response.data;
  },

  async create(data: CreateVisitData): Promise<Visit> {
    const response = await api.post('/visits', data);
    return response.data;
  },

  async update(id: number | string, data: Partial<CreateVisitData>): Promise<Visit> {
    const response = await api.put(`/visits/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<void> {
    await api.delete(`/visits/${id}`);
  },

  async updateStatus(id: number | string, status: string): Promise<Visit> {
    const response = await api.patch(`/visits/${id}/status`, { status });
    return response.data;
  },
};
