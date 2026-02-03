// src/hooks/queries/useFolderQueries.ts
// React Query hooks for folder operations
//
// NOTE: The app currently uses useFolderStore (Zustand) for folder state management.
// These React Query hooks are provided as an alternative for future migration.
// To use React Query, replace useFolderStore calls with these hooks.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
 */
export function useFolders() {
  return useQuery({
    queryKey: folderKeys.lists(),
    queryFn: async () => {
      const response = await getFolders();
      return response.data;
    },
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
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
    },
  });
}
