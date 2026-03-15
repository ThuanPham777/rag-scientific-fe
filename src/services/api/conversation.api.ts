// src/services/api/conversation.api.ts
// Conversation related API calls

import api from '../../config/axios';
import type {
  ApiResponse,
  Conversation,
  ConversationHistoryItem,
  SuggestedQuestionsResult,
  FollowUpQuestionsResult,
} from '../../utils/types';

// Extended conversation type with multi-paper support
export interface ConversationWithPapers extends Conversation {
  type?: 'SINGLE_PAPER' | 'MULTI_PAPER' | 'GROUP';
  papers?: Array<{
    id: string;
    ragFileId: string;
    title?: string;
    fileName: string;
    fileUrl?: string;
    orderIndex: number;
  }>;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    imageUrl?: string;
    context?: any;
    createdAt: string;
  }>;
}

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
 * List conversations, optionally filtered by paper ID or type
 */
export async function listConversations(
  paperId?: string,
  type?: 'SINGLE_PAPER' | 'MULTI_PAPER',
): Promise<ApiResponse<Conversation[]>> {
  const params: Record<string, string> = {};
  if (paperId) params.paperId = paperId;
  if (type) params.type = type;
  const { data } = await api.get('/conversations', { params });
  return data;
}

/**
 * List only multi-paper conversations
 */
export async function listMultiPaperConversations(): Promise<
  ApiResponse<Conversation[]>
> {
  return listConversations(undefined, 'MULTI_PAPER');
}

/**
 * Get a single conversation by ID (includes papers for multi-paper)
 */
export async function getConversation(
  id: string,
): Promise<{ success: boolean; data: ConversationWithPapers }> {
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
 * Get full conversation history (with stats) for the current user
 */
export async function getConversationHistory(): Promise<
  ApiResponse<ConversationHistoryItem[]>
> {
  const { data } = await api.get('/conversations/history');
  return data;
}

/**
 * Rename a conversation
 */
export async function updateConversation(
  id: string,
  payload: { title: string },
): Promise<ApiResponse<Conversation>> {
  const { data } = await api.patch(`/conversations/${id}`, payload);
  return data;
}

/**
 * Close a conversation (no further chat)
 */
export async function closeConversation(
  id: string,
): Promise<{ success: boolean }> {
  const { data } = await api.patch(`/conversations/${id}/close`);
  return data;
}

/**
 * Start a chat session by creating a conversation for a paper
 * This is a convenience wrapper around createConversation that returns only the conversationId
 */
export async function startSession(
  paperId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ragFileId?: string,
): Promise<{ conversationId: string }> {
  const res = await createConversation(paperId);
  return {
    conversationId: res.data.id,
  };
}

// ============================================================
// Multi-Paper Session Management
// ============================================================

/**
 * Add a paper to a multi-paper conversation
 */
export async function addPaperToConversation(
  conversationId: string,
  paperId: string,
): Promise<ApiResponse<null>> {
  const { data } = await api.post(`/conversations/${conversationId}/papers`, {
    paperId,
  });
  return data;
}

/**
 * Remove a paper from a multi-paper conversation
 */
export async function removePaperFromConversation(
  conversationId: string,
  paperId: string,
): Promise<ApiResponse<null>> {
  const { data } = await api.delete(
    `/conversations/${conversationId}/papers/${paperId}`,
  );
  return data;
}

// ============================================================
// Suggested Questions (conversation-level)
// ============================================================

/**
 * Generate suggested questions for a conversation.
 * If no textInput, caches generic questions; otherwise generates fresh.
 */
export async function generateSuggestedQuestions(
  conversationId: string,
  textInput?: string,
): Promise<ApiResponse<SuggestedQuestionsResult>> {
  const { data } = await api.post(
    `/conversations/${conversationId}/suggested-questions`,
    { textInput: textInput || undefined },
  );
  return data;
}

/**
 * Get cached suggested questions for a conversation (no generation).
 */
export async function getSuggestedQuestions(
  conversationId: string,
): Promise<ApiResponse<SuggestedQuestionsResult>> {
  const { data } = await api.get(
    `/conversations/${conversationId}/suggested-questions`,
  );
  return data;
}

// ============================================================
// Follow-Up Questions (message-level)
// ============================================================

/**
 * Get (or auto-generate) follow-up questions for a specific assistant message.
 */
export async function generateFollowUpQuestions(
  conversationId: string,
  messageId: string,
): Promise<ApiResponse<FollowUpQuestionsResult>> {
  const { data } = await api.get(
    `/conversations/${conversationId}/messages/${messageId}/followup-questions`,
  );
  return data;
}
