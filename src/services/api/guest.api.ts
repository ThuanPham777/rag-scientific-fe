// src/services/api/guest.api.ts
// Guest (non-authenticated) user API calls

import api from '../../config/axios';
import type { ChatMessage, Citation } from '../../utils/types';
import { parseCitationsFromResponse } from '@/utils/citation';

export interface GuestUploadResult {
  paperId: string;
  ragFileId: string;
  fileName: string;
  fileUrl: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface GuestAskResult {
  answer: string;
  citations: any[];
  modelName?: string;
  tokenCount?: number;
}

/**
 * Upload PDF for guest user (no authentication required)
 * Returns immediately after S3 upload, ingest runs in background
 */
export async function guestUploadPdf(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ guestPaper: GuestUploadResult }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/guest/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    },
  });

  return {
    guestPaper: data.data,
  };
}

/**
 * Check ingest status for guest paper
 */
export async function guestCheckIngestStatus(
  ragFileId: string,
): Promise<{ status: 'PROCESSING' | 'COMPLETED' | 'FAILED' }> {
  const { data } = await api.get(`/guest/status/${ragFileId}`);
  return { status: data.data.status };
}

/**
 * Ask question for guest session
 */
export async function guestAskQuestion(
  ragFileId: string,
  question: string,
  paperId: string = '',
): Promise<{ answer: string; citations: Citation[]; raw: GuestAskResult }> {
  const { data } = await api.post('/guest/ask', {
    ragFileId,
    question,
  });

  const result = data.data as GuestAskResult;
  const citations = parseCitationsFromResponse(result.citations || [], paperId);

  return {
    answer: result.answer,
    citations,
    raw: result,
  };
}

/**
 * Explain region for guest session
 */
export async function guestExplainRegion(
  ragFileId: string,
  imageBase64: string,
  pageNumber?: number,
  question?: string,
  paperId: string = '',
): Promise<{ answer: string; citations: Citation[]; raw: GuestAskResult }> {
  const { data } = await api.post('/guest/explain-region', {
    ragFileId,
    imageBase64,
    pageNumber,
    question,
  });

  const result = data.data as GuestAskResult;
  const citations = parseCitationsFromResponse(result.citations || [], paperId);

  return {
    answer: result.answer,
    citations,
    raw: result,
  };
}

/**
 * Build guest assistant message object
 */
export function buildGuestAssistantMessage(
  answer: string,
  citations: Citation[],
  modelName?: string,
  tokenCount?: number,
): ChatMessage {
  return {
    id: `guest_msg_${crypto.randomUUID()}`,
    role: 'assistant',
    content: answer,
    citations,
    modelName,
    tokenCount,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build a user ChatMessage for guest
 */
export function buildGuestUserMessage(
  content: string,
  imageDataUrl?: string,
): ChatMessage {
  return {
    id: `guest_msg_${crypto.randomUUID()}`,
    role: 'user',
    content,
    imageDataUrl,
    createdAt: new Date().toISOString(),
  };
}
