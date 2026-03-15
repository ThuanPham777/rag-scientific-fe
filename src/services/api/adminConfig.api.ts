import api from '../../config/axios';

// ─── System Config ──────────────────────────

export const getSystemConfigs = () => api.get('/admin/config');

export const updateSystemConfig = (key: string, value: any) =>
    api.patch(`/admin/config/${key}`, { value });

export const restoreDefaultConfig = (key: string) =>
    api.post(`/admin/config/restore-default/${key}`);

export const getLlmModels = () => api.get('/admin/config/llm-models');

// ─── KB Categories ──────────────────────────

export const getKbCategories = () => api.get('/admin/kb/categories');

export const createKbCategory = (data: {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
}) => api.post('/admin/kb/categories', data);

export const updateKbCategory = (
    id: string,
    data: { name?: string; slug?: string; description?: string },
) => api.patch(`/admin/kb/categories/${id}`, data);

export const deleteKbCategory = (id: string) =>
    api.delete(`/admin/kb/categories/${id}`);

// ─── KB Papers ──────────────────────────────

export const getKbPapers = (params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
}) => api.get('/admin/kb/papers', { params });

export const addPaperToKb = (paperId: string, categoryIds: string[]) =>
    api.post(`/admin/kb/papers/${paperId}/add`, { categoryIds });

export const removePaperFromKb = (paperId: string) =>
    api.delete(`/admin/kb/papers/${paperId}`);

export const classifyPaper = (paperId: string) =>
    api.post(`/admin/kb/papers/${paperId}/classify`);

// ─── Ingest Wizard ──────────────────────────

export const getAllPapers = (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/kb/all-papers', { params });

export const getChunksPreview = (paperId: string, page: number = 1) =>
    api.get(`/admin/kb/papers/${paperId}/chunks`, { params: { page, limit: 20 } });

export const updatePaperKbTags = (paperId: string, tags: string[]) =>
    api.patch(`/admin/kb/papers/${paperId}/tags`, { tags });

export const deletePaper = (paperId: string) =>
    api.delete(`/admin/kb/papers/${paperId}`);
