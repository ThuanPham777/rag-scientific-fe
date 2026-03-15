// src/services/api/user.api.ts
// User profile API calls

import api from '../../config/axios';

export interface UpdateProfileData {
    displayName?: string;
    avatarUrl?: string;
}

export interface ChangePasswordData {
    oldPassword: string;
    newPassword: string;
}

export interface UserStats {
    papersUploaded: number;
    conversations: number;
    collaborativeSessions: number;
    memberSince: string | null;
}

export interface MeResponse {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    provider: 'LOCAL' | 'GOOGLE';
    createdAt: string;
    stats: UserStats;
}

/**
 * Get current user profile with dashboard stats
 */
export async function getMe(): Promise<{ success: boolean; data: MeResponse }> {
    const { data } = await api.get('/users/me');
    return data;
}

/**
 * Update current user's display name or avatar URL
 */
export async function updateProfile(
    payload: UpdateProfileData,
): Promise<{ success: boolean; message: string; data: any }> {
    const { data } = await api.patch('/users/me', payload);
    return data;
}

/**
 * Change password (LOCAL accounts only)
 */
export async function changePassword(
    payload: ChangePasswordData,
): Promise<{ success: boolean; message: string }> {
    const { data } = await api.patch('/users/me/password', payload);
    return data;
}
