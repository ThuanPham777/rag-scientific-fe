import api from '@/config/axios';

export interface NotebookItem {
  id: string;
  userId: string;
  title: string;
  contentPreview?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookDetail extends NotebookItem {
  content: string;
}

const base = '/notebooks';

export default {
  list: async (): Promise<NotebookItem[]> => {
    const resp = await api.get(base);
    return resp.data.data;
  },

  get: async (id: string): Promise<NotebookDetail> => {
    const resp = await api.get(`${base}/${id}`);
    return resp.data.data;
  },

  create: async (payload: { title?: string; content?: string }) => {
    const resp = await api.post(base, payload);
    return resp.data.data;
  },

  update: async (id: string, payload: { title?: string; content?: string }) => {
    const resp = await api.put(`${base}/${id}`, payload);
    return resp.data.data;
  },

  remove: async (id: string) => {
    const resp = await api.delete(`${base}/${id}`);
    return resp.data.data;
  },
};
