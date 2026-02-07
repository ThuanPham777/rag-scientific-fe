// src/hooks/queries/usePaperQueries.ts
// React Query hooks for paper operations
// This is the primary source of truth for paper data (server state)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listPapers,
  getPaper,
  createPaper,
  deletePaper,
  uploadPdf,
} from '../../services';
import { folderKeys } from './useFolderQueries';

// Query keys
export const paperKeys = {
  all: ['papers'] as const,
  lists: () => [...paperKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...paperKeys.lists(), filters] as const,
  details: () => [...paperKeys.all, 'detail'] as const,
  detail: (id: string) => [...paperKeys.details(), id] as const,
};

/**
 * Hook to fetch all papers
 */
export function usePapers() {
  return useQuery({
    queryKey: paperKeys.lists(),
    queryFn: async () => {
      const response = await listPapers();
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch a single paper
 */
export function usePaper(id: string | undefined) {
  return useQuery({
    queryKey: paperKeys.detail(id!),
    queryFn: async () => {
      const response = await getPaper(id!);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - paper details don't change often
  });
}

/**
 * Hook to upload a PDF
 * Handles both file upload and paper record creation
 */
export function useUploadPaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      folderId,
      onProgress,
    }: {
      file: File;
      folderId?: string;
      onProgress?: (pct: number) => void;
    }) => {
      return uploadPdf(file, onProgress, folderId);
    },
    onSuccess: (data) => {
      // Invalidate and refetch papers list
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      // Invalidate folder-related queries
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      // Add the new paper to the cache
      queryClient.setQueryData(paperKeys.detail(data.paper.id), data.paper);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to upload paper';
      toast.error(msg);
    },
  });
}

/**
 * Hook to delete a paper
 */
export function useDeletePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePaper(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: paperKeys.detail(deletedId) });
      // Refetch list
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      // Invalidate folder-related queries
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      toast.success('Paper deleted');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to delete paper';
      toast.error(msg);
    },
  });
}

/**
 * Hook to create a paper record
 * NOTE: Currently app uses uploadPdf which handles both upload and paper creation.
 * This hook is available for cases where paper record needs to be created separately.
 */
export function useCreatePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaper,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.setQueryData(paperKeys.detail(data.data.id), data.data);
    },
  });
}
