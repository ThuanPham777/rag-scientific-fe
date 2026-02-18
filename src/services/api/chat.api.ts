// src/services/api/chat.api.ts
// Chat and messaging related API calls

import api from '../../config/axios';
import type { ChatMessage } from '../../utils/types';
import { parseCitationsFromResponse } from '@/utils/citation';

interface AskQuestionResponse {
  success: boolean;
  message: string;
  data: {
    answer: string;
    citations: any[];
    assistantMessageId: string;
    userMessageId: string;
    conversationId?: string;
    modelName?: string;
    tokenCount?: number;
  };
}

/**
 * Send a question to the chat API
 */
export async function sendQuery(
  conversationId: string,
  question: string,
  activePaperId?: string,
): Promise<{ assistantMsg: ChatMessage; raw: any }> {
  const { data } = await api.post<AskQuestionResponse>('/chat/ask', {
    conversationId,
    question,
  });

  const citations = parseCitationsFromResponse(
    data.data.citations || [],
    activePaperId,
  );

  const assistantMsg: ChatMessage = {
    id: data.data.assistantMessageId,
    role: 'assistant',
    content: data.data.answer,
    citations,
    modelName: data.data.modelName,
    tokenCount: data.data.tokenCount,
    createdAt: new Date().toISOString(),
  };

  return { assistantMsg, raw: data.data };
}

/**
 * Send a plain chat message in collaborative session (no AI response).
 * Used when user doesn't @Assistant.
 */
export async function sendPlainMessage(
  conversationId: string,
  content: string,
): Promise<{
  id: string;
  content: string;
  userId: string;
  displayName: string;
  createdAt: string;
}> {
  const { data } = await api.post('/chat/send-message', {
    conversationId,
    content,
  });
  return data.data;
}

/**
 * Get message history for a conversation (cursor-paginated)
 * Backend returns messages in DESC order (newest first).
 */
export async function getMessageHistory(
  conversationId: string,
  paperId?: string,
  cursor?: string,
  limit: number = 20,
): Promise<{ items: ChatMessage[]; nextCursor?: string; hasNext: boolean }> {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;

  const { data } = await api.get(`/chat/messages/${conversationId}`, {
    params,
  });

  const response = data.data; // CursorPaginationDto { items, pagination }

  const items: ChatMessage[] = (response.items || []).map((m: any) => ({
    id: m.id,
    role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
    content: m.content,
    imageUrl: m.imageUrl,
    imageDataUrl: m.imageUrl || undefined,
    modelName: m.modelName,
    tokenCount: m.tokenCount,
    citations: m.citations
      ? parseCitationsFromResponse(m.citations, paperId)
      : undefined,
    userId: m.userId,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    createdAt: m.createdAt,
    reactions: m.reactions || undefined,
    replyTo: m.replyTo || undefined,
    isDeleted: m.isDeleted || false,
  }));

  return {
    items,
    nextCursor: response.pagination?.nextCursor,
    hasNext: response.pagination?.hasNext ?? false,
  };
}

/**
 * Explain a selected region (image) in the PDF
 */
export async function explainRegion(
  imageDataUrl: string,
  options: {
    conversationId?: string;
    paperId?: string;
    pageNumber?: number;
    question?: string;
  },
): Promise<{ assistantMsg: ChatMessage; conversationId?: string; raw: any }> {
  // Extract base64 part
  const commaIdx = imageDataUrl.indexOf(',');
  const imageBase64 =
    commaIdx >= 0 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;

  const { data } = await api.post<AskQuestionResponse>('/chat/explain-region', {
    conversationId: options.conversationId,
    paperId: options.paperId,
    imageBase64,
    pageNumber: options.pageNumber,
    question: options.question,
  });

  const assistantMsg: ChatMessage = {
    id: data.data.assistantMessageId,
    role: 'assistant',
    content: data.data.answer,
    citations: parseCitationsFromResponse(
      data.data.citations || [],
      options.paperId,
    ),
    createdAt: new Date().toISOString(),
  };

  return {
    assistantMsg,
    conversationId: data.data.conversationId,
    raw: data.data,
  };
}

// ============================
// 🔹 MULTI-PAPER CHAT API
// ============================

export interface MultiPaperSource {
  paperId: string;
  title: string;
}

export interface MultiPaperQueryResult {
  answer: string;
  citations: any[];
  sources: MultiPaperSource[];
  assistantMessageId?: string;
  userMessageId?: string;
  conversationId?: string;
}

/**
 * Ask a question across multiple papers
 */
export async function askMultiPaper(
  paperIds: string[],
  question: string,
  conversationId?: string,
): Promise<{
  assistantMsg: ChatMessage;
  sources: MultiPaperSource[];
  conversationId: string;
  raw: any;
}> {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: MultiPaperQueryResult;
  }>('/chat/ask-multi', {
    paperIds,
    question,
    conversationId,
  });

  const citations = parseCitationsFromResponse(data.data.citations || []);

  const assistantMsg: ChatMessage = {
    id: data.data.assistantMessageId || crypto.randomUUID(),
    role: 'assistant',
    content: data.data.answer,
    citations,
    createdAt: new Date().toISOString(),
  };

  return {
    assistantMsg,
    sources: data.data.sources || [],
    conversationId: data.data.conversationId || '',
    raw: data.data,
  };
}

export async function clearChatHistory(
  conversationId: string,
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/chat/history/${conversationId}`);
  return data;
}

// ============================
// 🔹 REACTIONS API
// ============================

/**
 * Toggle a reaction on a message.
 * Same emoji = remove, different emoji = update, no existing = add.
 */
export async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<{
  action: 'added' | 'removed' | 'updated';
  messageId: string;
  emoji: string;
  userId: string;
  conversationId: string;
}> {
  const { data } = await api.post('/chat/reactions/toggle', {
    messageId,
    emoji,
  });
  return data.data;
}

// ============================
// 🔹 REPLY TO MESSAGE API
// ============================

/**
 * Reply to an existing message in a conversation.
 */
export async function replyToMessage(
  conversationId: string,
  replyToMessageId: string,
  content: string,
): Promise<{
  id: string;
  content: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  replyToMessageId: string;
  replyTo: {
    id: string;
    content: string;
    role: string;
    displayName?: string;
    isDeleted?: boolean;
  };
  createdAt: string;
}> {
  const { data } = await api.post('/chat/reply', {
    conversationId,
    replyToMessageId,
    content,
  });
  return data.data;
}

// ============================
// 🔹 DELETE MESSAGE API
// ============================

/**
 * Soft-delete a message. Users can delete own messages.
 * Owners can also delete assistant messages.
 */
export async function deleteMessageApi(
  conversationId: string,
  messageId: string,
): Promise<{ messageId: string; conversationId: string }> {
  const { data } = await api.post('/chat/delete-message', {
    conversationId,
    messageId,
  });
  return data.data;
}
