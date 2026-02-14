// src/services/api/session.api.ts
// Collaborative session related API calls

import api from '../../config/axios';
import type {
  ApiResponse,
  SessionDetail,
  SessionInvite,
  CreateSessionResult,
} from '../../utils/types';

// ============================================================================
// Session Lifecycle
// ============================================================================

/**
 * Create a collaborative session for a paper.
 * Creates a NEW collaborative conversation referencing the same paper.
 */
export async function createSession(
  paperId: string,
  maxMembers?: number,
  sourceConversationId?: string,
): Promise<ApiResponse<CreateSessionResult>> {
  const { data } = await api.post('/sessions', {
    paperId,
    maxMembers,
    sourceConversationId,
  });
  return data;
}

/**
 * Join a session using an invite token.
 */
export async function joinSession(
  inviteToken: string,
): Promise<ApiResponse<SessionDetail>> {
  const { data } = await api.post('/sessions/join', { inviteToken });
  return data;
}

/**
 * Leave a collaborative session.
 */
export async function leaveSession(
  conversationId: string,
): Promise<ApiResponse<null>> {
  const { data } = await api.post(`/sessions/${conversationId}/leave`);
  return data;
}

/**
 * End a collaborative session (owner only).
 */
export async function endSession(
  conversationId: string,
): Promise<ApiResponse<null>> {
  const { data } = await api.delete(`/sessions/${conversationId}`);
  return data;
}

// ============================================================================
// Member Management
// ============================================================================

/**
 * Get session detail with members.
 */
export async function getSessionDetail(
  conversationId: string,
): Promise<ApiResponse<SessionDetail>> {
  const { data } = await api.get(`/sessions/${conversationId}`);
  return data;
}

/**
 * Get session members.
 */
export async function getSessionMembers(
  conversationId: string,
): Promise<ApiResponse<SessionDetail>> {
  const { data } = await api.get(`/sessions/${conversationId}/members`);
  return data;
}

/**
 * Remove a member from the session (owner only).
 */
export async function removeMember(
  conversationId: string,
  userId: string,
): Promise<ApiResponse<{ removed: boolean; userId: string }>> {
  const { data } = await api.delete(
    `/sessions/${conversationId}/members/${userId}`,
  );
  return data;
}

// ============================================================================
// Invite Management
// ============================================================================

/**
 * Create an invite link for a session.
 */
export async function createInvite(
  conversationId: string,
  maxUses?: number,
  expiresInHours?: number,
): Promise<ApiResponse<SessionInvite>> {
  const { data } = await api.post(`/sessions/${conversationId}/invites`, {
    maxUses,
    expiresInHours,
  });
  return data;
}

/**
 * Revoke an invite link (owner only).
 */
export async function revokeInvite(
  inviteToken: string,
): Promise<ApiResponse<null>> {
  const { data } = await api.delete(`/sessions/invites/${inviteToken}`);
  return data;
}

// ============================================================================
// Session Queries
// ============================================================================

/**
 * List all collaborative sessions the user is a member of.
 */
export async function listSessions(): Promise<ApiResponse<SessionDetail[]>> {
  const { data } = await api.get('/sessions');
  return data;
}
