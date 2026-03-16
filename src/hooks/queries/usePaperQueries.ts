// src/hooks/queries/usePaperQueries.ts
// React Query hooks for paper operations
// This is the primary source of truth for paper data (server state)

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listPapers,
  getPaper,
  createPaper,
  deletePaper,
  uploadPdf,
  deleteAllPapers,
} from '../../services';
import type { Paper } from '../../utils/types';

// Query keys
export const paperKeys = {
  all: ['papers'] as const,
  lists: () => [...paperKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...paperKeys.lists(), filters] as const,
  infinite: () => [...paperKeys.all, 'infinite'] as const,
  details: () => [...paperKeys.all, 'detail'] as const,
  detail: (id: string) => [...paperKeys.details(), id] as const,
};

/**
 * Hook to fetch all papers (cursor-paginated via useInfiniteQuery)
 * Auto-refreshes when papers are being processed
 */
export function usePapers() {
  // First, get initial data to check for processing papers
  const infiniteQuery = useInfiniteQuery({
    queryKey: paperKeys.infinite(),
    queryFn: ({ pageParam }) => listPapers(pageParam, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    staleTime: 10 * 1000, // Reduced to 10 seconds for faster updates
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Flatten pages into a single array for backwards-compatible usage
  const allPapers: Paper[] =
    infiniteQuery.data?.pages?.flatMap((page) => page.items) ?? [];

  // Check if any papers are being processed
  const hasProcessingPapers = allPapers.some(
    (paper) => paper.status === 'PROCESSING' || paper.status === 'PENDING',
  );

  return {
    ...infiniteQuery,
    /** Flat array of all loaded papers (across all fetched pages) */
    data: allPapers,
    /** Whether any papers are currently being processed */
    hasProcessingPapers,
  };
}

/**
 * Hook to fetch a single paper
 * Auto-polls every 3 seconds when the paper is still being ingested (PENDING/PROCESSING).
 * Once ingestion completes (COMPLETED/FAILED), polling stops and normal staleTime applies.
 */
export function usePaper(id: string | undefined) {
  return useQuery({
    queryKey: paperKeys.detail(id!),
    queryFn: async () => {
      const response = await getPaper(id!);
      return response.data;
    },
    enabled: !!id && !id.startsWith('uploading-'),
    staleTime: 5 * 60 * 1000, // 5 minutes - paper details don't change often
    // Poll every 3s while the paper is still being ingested; stop once done.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'PROCESSING') {
        return 3000;
      }
      return false;
    },
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
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => {
      return uploadPdf(file, onProgress);
    },
    onSuccess: (data) => {
      // Invalidate and refetch papers (covers both list and infinite queries)
      queryClient.invalidateQueries({ queryKey: paperKeys.all });
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
      // Refetch papers (covers both list and infinite queries)
      queryClient.invalidateQueries({ queryKey: paperKeys.all });
      toast.success('Paper deleted');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to delete paper';
      toast.error(msg);
    },
  });
}

/**
 * Hook to delete selected papers by IDs.
 * Calls DELETE /papers/:id for each paper in parallel, then refreshes the list.
 */
export function useDeleteSelectedPapers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => deletePaper(id)),
      );
      const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled');
      const failed = ids.filter((_, i) => results[i].status === 'rejected');
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      // Remove deleted papers from cache
      for (const id of succeeded) {
        queryClient.removeQueries({ queryKey: paperKeys.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: paperKeys.all });

      if (failed.length > 0) {
        toast.success(
          `Deleted ${succeeded.length} paper(s). ${failed.length} failed.`,
        );
      } else {
        toast.success(`Deleted ${succeeded.length} paper(s) successfully`);
      }
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to delete selected papers';
      toast.error(msg);
    },
  });
}

/**
 * Hook to delete ALL papers for the current user.
 * Papers with active collaborative sessions are skipped.
 */
export function useDeleteAllPapers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllPapers(),
    onSuccess: (result) => {
      // Clear entire paper cache
      queryClient.removeQueries({ queryKey: paperKeys.details() });
      queryClient.invalidateQueries({ queryKey: paperKeys.all });

      const { deletedCount, skippedIds } = result.data;
      if (skippedIds.length > 0) {
        toast.success(
          `Deleted ${deletedCount} paper(s). ${skippedIds.length} paper(s) skipped (active collaboration).`,
        );
      } else {
        toast.success(`Deleted ${deletedCount} paper(s) successfully`);
      }
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message || 'Failed to delete all papers';
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
      queryClient.invalidateQueries({ queryKey: paperKeys.all });
      queryClient.setQueryData(paperKeys.detail(data.data.id), data.data);
    },
  });
}
