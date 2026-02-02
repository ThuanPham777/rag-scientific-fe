// src/services/api/folder.api.ts
// Folder (My Library) related API calls

import api from '../../config/axios';
import type { Folder, FolderWithPapers, Paper } from '../../utils/types';

/**
 * Get all folders for current user
 */
export async function getFolders(): Promise<{
  success: boolean;
  data: Folder[];
}> {
  const { data } = await api.get('/folders');
  return { success: true, data: Array.isArray(data) ? data : data.data || [] };
}

/**
 * Get a single folder with its papers
 */
export async function getFolder(
  id: string,
): Promise<{ success: boolean; data: FolderWithPapers }> {
  const { data } = await api.get(`/folders/${id}`);
  return { success: true, data: data.data || data };
}

/**
 * Get uncategorized papers (not in any folder)
 */
export async function getUncategorizedPapers(): Promise<{
  success: boolean;
  data: Paper[];
}> {
  const { data } = await api.get('/folders/uncategorized');
  return { success: true, data: Array.isArray(data) ? data : data.data || [] };
}

/**
 * Create a new folder
 */
export async function createFolder(folderData: {
  name: string;
}): Promise<{ success: boolean; data: Folder }> {
  const { data } = await api.post('/folders', folderData);
  return { success: true, data: data.data || data };
}

/**
 * Update a folder
 */
export async function updateFolder(
  id: string,
  folderData: {
    name?: string;
    orderIndex?: number;
  },
): Promise<{ success: boolean; data: Folder }> {
  const { data } = await api.put(`/folders/${id}`, folderData);
  return { success: true, data: data.data || data };
}

/**
 * Delete a folder and all papers in it
 */
export async function deleteFolder(id: string): Promise<{
  success: boolean;
  data: { message: string; deletedPapers?: number };
}> {
  const { data } = await api.delete(`/folders/${id}`);
  return { success: true, data: data.data || data };
}

/**
 * Move a paper to a folder (or remove from folder)
 */
export async function movePaperToFolder(
  paperId: string,
  folderId: string | null,
): Promise<{ success: boolean; data: Paper }> {
  const { data } = await api.patch(`/folders/papers/${paperId}/move`, {
    folderId,
  });
  return { success: true, data: data.data || data };
}
