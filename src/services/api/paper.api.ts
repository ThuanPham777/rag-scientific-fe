// src/services/api/paper.api.ts
// Paper (PDF) related API calls

import api from '../../config/axios';
import type { ApiResponse, Paper } from '../../utils/types';

export interface CreatePaperParams {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileHash?: string;
  folderId?: string;
}

/**
 * Create a new paper record in the database
 */
export async function createPaper(
  params: CreatePaperParams,
): Promise<ApiResponse<Paper>> {
  const { data } = await api.post('/papers', params);
  return data;
}

/**
 * List all papers for the current user
 */
export async function listPapers(): Promise<ApiResponse<Paper[]>> {
  const { data } = await api.get('/papers');
  return data;
}

/**
 * Get a single paper by ID
 */
export async function getPaper(id: string): Promise<ApiResponse<Paper>> {
  const { data } = await api.get(`/papers/${id}`);
  return data;
}

/**
 * Delete a paper by ID
 */
export async function deletePaper(id: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/papers/${id}`);
  return data;
}

/**
 * Upload PDF to S3 and create paper record
 */
export async function uploadPdf(
  file: File,
  onProgress?: (pct: number) => void,
  folderId?: string,
): Promise<{ paper: Paper; localUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);

  // 1. Upload to S3
  const uploadRes = await api.post('/upload/pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    },
  });

  const { url } = uploadRes.data.data;

  // 2. Create paper record in DB
  const createRes = await api.post('/papers', {
    fileName: file.name,
    fileUrl: url,
    fileSize: file.size,
    folderId: folderId || undefined,
  });

  const paper = createRes.data.data;
  const localUrl = URL.createObjectURL(file);

  return {
    paper: { ...paper, localUrl },
    localUrl,
  };
}
