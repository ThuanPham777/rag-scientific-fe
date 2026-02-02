// src/services/api/conversation.api.ts
// Conversation related API calls

import api from '../../config/axios';
import type { ApiResponse, Conversation } from '../../utils/types';

/**
 * Create a new conversation for a paper
 */
export async function createConversation(
  paperId: string,
  title?: string,
): Promise<ApiResponse<Conversation>> {
  const { data } = await api.post('/conversations', { paperId, title });
  return data;
}

/**
 * List conversations, optionally filtered by paper ID
 */
export async function listConversations(
  paperId?: string,
): Promise<ApiResponse<Conversation[]>> {
  const params = paperId ? { paperId } : {};
  const { data } = await api.get('/conversations', { params });
  return data;
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(
  id: string,
): Promise<{ success: boolean; data: Conversation }> {
  const { data } = await api.get(`/conversations/${id}`);
  return data;
}

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(
  id: string,
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/conversations/${id}`);
  return data;
}

/**
 * Start a new session by creating a conversation
 */
export async function startSession(
  paperId: string,
  _ragFileId?: string,
): Promise<{ conversationId: string }> {
  const res = await createConversation(paperId);
  return {
    conversationId: res.data.id,
  };
}
