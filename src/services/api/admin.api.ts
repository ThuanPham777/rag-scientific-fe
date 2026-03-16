// src/services/api/admin.api.ts
// Admin management API calls (superadmin only)

import api from '../../config/axios';

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalPapers: number;
    totalConversations: number;
    conversationsInRange: number;
    newUsersInRange: number;
    rangeDays: number;
    since: string;
}

export interface AdminUser {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    provider: 'LOCAL' | 'GOOGLE';
    role: 'USER' | 'SUPERADMIN';
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
    _count?: {
        papers: number;
        conversations: number;
        sessionMembers: number;
        notebooks?: number;
    };
    sharedSessions?: number;
}

export interface AdminPaper {
    id: string;
    fileName: string;
    title?: string;
    status: string;
    fileSize?: number;
    numPages?: number;
    createdAt: string;
    processedAt?: string;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export async function getSystemStats(days: number = 7): Promise<{ data: SystemStats }> {
    const { data } = await api.get(`/admin/stats?days=${days}`);
    return data;
}

export async function getRecentUsers(limit: number = 10): Promise<{ data: AdminUser[] }> {
    const { data } = await api.get(`/admin/stats/recent-users?limit=${limit}`);
    return data;
}

// ============================================================
// USER MANAGEMENT
// ============================================================

export async function getAdminUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}): Promise<{ users: AdminUser[]; pagination: PaginationMeta }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.isActive !== undefined)
        queryParams.set('isActive', String(params.isActive));

    const { data } = await api.get(`/admin/users?${queryParams}`);
    return data;
}

export async function getAdminUserDetail(
    userId: string,
): Promise<{ data: AdminUser }> {
    const { data } = await api.get(`/admin/users/${userId}`);
    return data;
}

export async function getAdminUserPapers(
    userId: string,
    page: number = 1,
    limit: number = 20,
): Promise<{ papers: AdminPaper[]; pagination: PaginationMeta }> {
    const { data } = await api.get(
        `/admin/users/${userId}/papers?page=${page}&limit=${limit}`,
    );
    return data;
}

export async function activateUser(userId: string) {
    const { data } = await api.patch(`/admin/users/${userId}/activate`);
    return data;
}

export async function deactivateUser(userId: string) {
    const { data } = await api.patch(`/admin/users/${userId}/deactivate`);
    return data;
}

export async function createAdminUser(body: {
    email: string;
    password: string;
    displayName?: string;
}) {
    const { data } = await api.post('/admin/users', body);
    return data;
}

export async function deleteAdminUser(userId: string) {
    const { data } = await api.delete(`/admin/users/${userId}`);
    return data;
}

export async function resetAdminUserPassword(userId: string) {
    const { data } = await api.post(`/admin/users/${userId}/reset-password`);
    return data;
}

// ============================================================
// LLM USAGE STATS
// ============================================================

export interface UsageByModel {
    model: string;
    provider: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
}

export interface UsageByDay {
    date: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
}

export interface UsageByPurpose {
    purpose: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
}

export interface UsageStats {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callsByModel: UsageByModel[];
    callsByDay: UsageByDay[];
    callsByPurpose: UsageByPurpose[];
}

export async function getUsageStats(days: number = 7): Promise<{ data: UsageStats }> {
    const { data } = await api.get(`/admin/usage-stats?days=${days}`);
    return data;
}
