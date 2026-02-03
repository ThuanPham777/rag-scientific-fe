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
 * Get message history for a conversation
 */
export async function getMessageHistory(
  conversationId: string,
  paperId?: string,
): Promise<ChatMessage[]> {
  const { data } = await api.get(`/chat/messages/${conversationId}`);

  return data.data.map((m: any) => ({
    id: m.id,
    role: m.role.toLowerCase() as 'user' | 'assistant',
    content: m.content,
    imageUrl: m.imageUrl,
    imageDataUrl: m.imageUrl || undefined,
    modelName: m.modelName,
    tokenCount: m.tokenCount,
    citations: m.citations
      ? parseCitationsFromResponse(m.citations, paperId)
      : undefined,
    createdAt: m.createdAt,
  }));
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

/**
 * Poll messages (legacy - kept for compatibility)
 */
export async function pollMessages(conversationId: string, paperId?: string) {
  const messages = await getMessageHistory(conversationId, paperId);
  return {
    messages,
    nextCursor: undefined,
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
