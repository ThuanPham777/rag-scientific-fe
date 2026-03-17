import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSystemConfigs,
    updateSystemConfig,
    restoreDefaultConfig,
    getLlmModels,
    getKbCategories,
    createKbCategory,
    updateKbCategory,
    deleteKbCategory,
    getKbPapers,
    addPaperToKb,
    removePaperFromKb,
    bulkRemovePapersFromKb,
    classifyPaper,
    getAllPapers,
    getChunksPreview,
    deletePaper,
    updatePaperKbTags,
} from '../services/api/adminConfig.api';

// ─── System Config Hooks ──────────────────────

export function useSystemConfigs() {
    return useQuery({
        queryKey: ['admin', 'config'],
        queryFn: getSystemConfigs,
    });
}

export function useLlmModels() {
    return useQuery({
        queryKey: ['admin', 'config', 'llm-models'],
        queryFn: getLlmModels,
    });
}

export function useUpdateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: any }) =>
            updateSystemConfig(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
        },
    });
}

export function useRestoreDefault() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (key: string) => restoreDefaultConfig(key),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
        },
    });
}

// ─── KB Category Hooks ────────────────────────

export function useKbCategories() {
    return useQuery({
        queryKey: ['admin', 'kb', 'categories'],
        queryFn: getKbCategories,
    });
}

export function useCreateKbCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createKbCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useUpdateKbCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            updateKbCategory(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useDeleteKbCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteKbCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

// ─── KB Paper Hooks ───────────────────────────

export function useKbPapers(params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['admin', 'kb', 'papers', params],
        queryFn: () => getKbPapers(params),
    });
}

export function useAddPaperToKb() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            paperId,
            categoryIds,
        }: {
            paperId: string;
            categoryIds: string[];
        }) => addPaperToKb(paperId, categoryIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useRemovePaperFromKb() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removePaperFromKb,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useBulkRemovePapersFromKb() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (paperIds: string[]) => bulkRemovePapersFromKb(paperIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useClassifyPaper() {
    return useMutation({
        mutationFn: classifyPaper,
    });
}

// ─── Ingest Wizard Hooks ──────────────────────

export function useAllPapers(params?: { page?: number; limit?: number; search?: string }) {
    return useQuery({
        queryKey: ['admin', 'kb', 'all-papers', params],
        queryFn: () => getAllPapers(params),
    });
}

export function useChunksPreview(paperId: string, page: number = 1) {
    return useQuery({
        queryKey: ['admin', 'kb', 'chunks', paperId, page],
        queryFn: () => getChunksPreview(paperId, page),
        enabled: !!paperId,
    });
}

export function useUpdatePaperTags() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ paperId, tags }: { paperId: string; tags: string[] }) =>
            updatePaperKbTags(paperId, tags),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}

export function useDeletePaper() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (paperId: string) => deletePaper(paperId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'kb'] });
        },
    });
}
