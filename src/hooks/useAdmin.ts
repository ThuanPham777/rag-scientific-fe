import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSystemStats,
    getRecentUsers,
    getAdminUsers,
    getAdminUserDetail,
    getAdminUserPapers,
    activateUser,
    deactivateUser,
    createAdminUser,
    deleteAdminUser,
    resetAdminUserPassword,
    getUsageStats,
} from '../services/api/admin.api';

// ============================================================
// DASHBOARD HOOKS
// ============================================================

export function useAdminStats(days: number = 7) {
    return useQuery({
        queryKey: ['admin', 'stats', days],
        queryFn: () => getSystemStats(days),
    });
}

export function useAdminRecentUsers(limit: number = 10) {
    return useQuery({
        queryKey: ['admin', 'recent-users', limit],
        queryFn: () => getRecentUsers(limit),
    });
}

export function useAdminUsageStats(days: number = 7) {
    return useQuery({
        queryKey: ['admin', 'usage-stats', days],
        queryFn: () => getUsageStats(days),
    });
}

// ============================================================
// USER LIST HOOK
// ============================================================

export function useAdminUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}) {
    return useQuery({
        queryKey: ['admin', 'users', params],
        queryFn: () => getAdminUsers(params),
    });
}

// ============================================================
// USER DETAIL HOOKS
// ============================================================

export function useAdminUserDetail(userId: string) {
    return useQuery({
        queryKey: ['admin', 'users', userId],
        queryFn: () => getAdminUserDetail(userId),
        enabled: !!userId,
    });
}

export function useAdminUserPapers(
    userId: string,
    page: number = 1,
    limit: number = 20,
) {
    return useQuery({
        queryKey: ['admin', 'users', userId, 'papers', page],
        queryFn: () => getAdminUserPapers(userId, page, limit),
        enabled: !!userId,
    });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

export function useActivateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: activateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

export function useDeactivateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deactivateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
}

export function useCreateAdminUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAdminUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}

export function useDeleteAdminUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAdminUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}

export function useResetUserPassword() {
    return useMutation({
        mutationFn: resetAdminUserPassword,
    });
}
