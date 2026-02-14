// src/hooks/queries/useSessionQueries.ts
// React Query hooks for collaborative session operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSession,
  joinSession,
  leaveSession,
  endSession,
  getSessionDetail,
  removeMember,
  createInvite,
  revokeInvite,
  listSessions,
} from '../../services';

// ============================================================================
// Query Keys
// ============================================================================

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (conversationId: string) =>
    [...sessionKeys.details(), conversationId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all collaborative sessions the user is part of.
 */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: async () => {
      const res = await listSessions();
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get session detail (members, code, etc.) for a conversation.
 */
export function useSessionDetail(
  conversationId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: sessionKeys.detail(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) throw new Error('conversationId required');
      const res = await getSessionDetail(conversationId);
      return res.data;
    },
    enabled: enabled && !!conversationId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a collaborative session for a paper.
 * A NEW collaborative conversation is created referencing the same paper.
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paperId,
      maxMembers,
    }: {
      paperId: string;
      maxMembers?: number;
    }) => createSession(paperId, maxMembers),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      // Invalidate session detail for the newly created conversation
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(data.data.conversationId),
      });
      toast.success('Collaborative session created!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create session';
      toast.error(msg);
    },
  });
}

/**
 * Join a session using an invite token.
 * Note: No toast here — JoinSessionPage handles its own success/error UI
 * to avoid duplicate notifications.
 */
export function useJoinSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteToken: string) => joinSession(inviteToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      // Invalidate session detail so it re-fetches with full SessionDetail shape
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(data.data.conversationId),
      });
    },
  });
}

/**
 * Leave a collaborative session.
 */
export function useLeaveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => leaveSession(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Left session');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to leave session';
      toast.error(msg);
    },
  });
}

/**
 * End a collaborative session (owner only).
 */
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => endSession(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.removeQueries({
        queryKey: sessionKeys.detail(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      toast.success('Session ended');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to end session';
      toast.error(msg);
    },
  });
}

/**
 * Remove a member from the session (owner only).
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => removeMember(conversationId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(variables.conversationId),
      });
      toast.success('Member removed');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to remove member';
      toast.error(msg);
    },
  });
}

/**
 * Create an invite link for a session.
 */
export function useCreateInvite() {
  return useMutation({
    mutationFn: ({
      conversationId,
      maxUses,
      expiresInHours,
    }: {
      conversationId: string;
      maxUses?: number;
      expiresInHours?: number;
    }) => createInvite(conversationId, maxUses, expiresInHours),
    onSuccess: () => {
      toast.success('Invite link created!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create invite';
      toast.error(msg);
    },
  });
}

/**
 * Revoke an invite link (owner only).
 */
export function useRevokeInvite() {
  return useMutation({
    mutationFn: (inviteToken: string) => revokeInvite(inviteToken),
    onSuccess: () => {
      toast.success('Invite revoked');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to revoke invite';
      toast.error(msg);
    },
  });
}
