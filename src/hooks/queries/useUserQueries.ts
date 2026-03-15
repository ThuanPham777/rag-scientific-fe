// src/hooks/queries/useUserQueries.ts
// React Query hooks for user profile operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, updateProfile, changePassword } from '../../services';
import { useAuthStore } from '../../store/useAuthStore';
import type { UpdateProfileData, ChangePasswordData } from '../../services/api/user.api';

export const USER_QUERY_KEYS = {
    me: ['me'] as const,
};

/**
 * Query: Get current user profile + dashboard stats
 */
export function useGetMe() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    return useQuery({
        queryKey: USER_QUERY_KEYS.me,
        queryFn: async () => {
            const res = await getMe();
            return res.data;
        },
        enabled: isAuthenticated,
        staleTime: 60_000, // 1 min
    });
}

/**
 * Mutation: Update display name / avatar URL
 * On success also updates the Zustand auth store so header avatar reflects change immediately
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const setUser = useAuthStore((s) => s.setUser);
    const currentUser = useAuthStore((s) => s.user);

    return useMutation({
        mutationFn: (data: UpdateProfileData) => updateProfile(data),
        onSuccess: (res) => {
            // Sync Zustand auth store so TopNav avatar updates immediately
            if (currentUser) {
                setUser({
                    ...currentUser,
                    displayName: res.data.displayName,
                    avatarUrl: res.data.avatarUrl,
                });
            }
            // Invalidate cached profile query
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.me });
        },
    });
}

/**
 * Mutation: Change password
 */
export function useChangePassword() {
    return useMutation({
        mutationFn: (data: ChangePasswordData) => changePassword(data),
    });
}
