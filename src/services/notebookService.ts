import api from '@/config/axios';

export interface NotebookItem {
  id: string;
  userId: string;
  title: string;
  contentPreview?: string;
  orderIndex: number;
  isCollaborative?: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
  // Only present in shared-with-me notebooks
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  isSharedWithMe?: boolean;
}

export interface NotebookDetail extends NotebookItem {
  content: string;
  collaborators?: Array<{
    id: string;
    userId: string;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }>;
}

const base = '/notebooks';

export default {
  list: async (): Promise<NotebookItem[]> => {
    const resp = await api.get(base);
    return resp.data.data;
  },

  listSharedWithMe: async (): Promise<NotebookItem[]> => {
    const resp = await api.get(`${base}/shared-with-me`);
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

  // Owner: truly deletes. Collaborator: soft-hides (handled server-side)
  remove: async (id: string) => {
    const resp = await api.delete(`${base}/${id}`);
    return resp.data.data;
  },

  // === Collaboration ===

  share: async (id: string): Promise<{ notebookId: string; shareToken: string }> => {
    const resp = await api.post(`${base}/${id}/share`);
    return resp.data.data;
  },

  joinByToken: async (token: string): Promise<{ notebookId: string; title: string }> => {
    const resp = await api.post(`${base}/join/${token}`);
    return resp.data.data;
  },

  getCollaborative: async (id: string): Promise<NotebookDetail> => {
    const resp = await api.get(`${base}/collab/${id}`);
    return resp.data.data;
  },

  updateCollaborative: async (id: string, payload: { title?: string; content?: string }) => {
    const resp = await api.put(`${base}/collab/${id}`, payload);
    return resp.data.data;
  },
};
