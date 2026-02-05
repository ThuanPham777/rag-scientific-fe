// src/hooks/queries/useFolderQueries.ts
// React Query hooks for folder operations
// This is the primary source of truth for folder data (server state)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getFolders,
  getFolder,
  getUncategorizedPapers,
  createFolder,
  updateFolder,
  deleteFolder,
  movePaperToFolder,
} from '../../services/api/folder.api';
import { paperKeys } from './usePaperQueries';

// Query keys
export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  details: () => [...folderKeys.all, 'detail'] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
  uncategorized: () => [...folderKeys.all, 'uncategorized'] as const,
};

/**
 * Hook to fetch all folders
 * @param enabled - Whether to enable the query (default: true)
 */
export function useFolders(enabled: boolean = true) {
  return useQuery({
    queryKey: folderKeys.lists(),
    queryFn: async () => {
      const response = await getFolders();
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled,
  });
}

/**
 * Hook to fetch a single folder with papers
 */
export function useFolder(id: string | undefined) {
  return useQuery({
    queryKey: folderKeys.detail(id!),
    queryFn: async () => {
      const response = await getFolder(id!);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch uncategorized papers
 */
export function useUncategorizedPapers() {
  return useQuery({
    queryKey: folderKeys.uncategorized(),
    queryFn: async () => {
      const response = await getUncategorizedPapers();
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string }) => createFolder(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      toast.success('Folder created');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create folder';
      toast.error(msg);
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; orderIndex?: number };
    }) => updateFolder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: folderKeys.detail(variables.id),
      });
      toast.success('Folder updated');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to update folder';
      toast.error(msg);
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: folderKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.uncategorized() });
      toast.success('Folder deleted');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to delete folder';
      toast.error(msg);
    },
  });
}

/**
 * Hook to move a paper to a folder
 */
export function useMovePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paperId,
      folderId,
    }: {
      paperId: string;
      folderId: string | null;
    }) => movePaperToFolder(paperId, folderId),
    onSuccess: () => {
      // Invalidate all folder-related queries
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      toast.success('Paper moved');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to move paper';
      toast.error(msg);
    },
  });
}
