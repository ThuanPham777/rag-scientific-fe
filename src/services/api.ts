import api from '../config/axios';
import type {
  ApiResponse,
  ChatMessage,
  Citation,
  Conversation,
  LoginResponse,
  Paper,
  RelatedPapersResponse,
  SignupResponse,
} from '../utils/types';

// ============================
// 🔹 AUTH API
// ============================

export async function signup(
  email: string,
  password: string,
  displayName?: string,
): Promise<SignupResponse> {
  const { data } = await api.post('/auth/signup', {
    email,
    password,
    displayName,
  });
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function googleAuth(idToken: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/google', { idToken });
  return data;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<LoginResponse> {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function logoutAll(): Promise<void> {
  await api.post('/auth/logout-all');
}

// ============================
// 🔹 PAPER API
// ============================

export async function createPaper(paperData: {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileHash?: string;
  folderId?: string;
}): Promise<ApiResponse<Paper>> {
  const { data } = await api.post('/papers', paperData);
  return data;
}

export async function listPapers(): Promise<ApiResponse<Paper[]>> {
  const { data } = await api.get('/papers');
  return data;
}

export async function getPaper(id: string): Promise<ApiResponse<Paper>> {
  const { data } = await api.get(`/papers/${id}`);
  return data;
}

export async function deletePaper(id: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/papers/${id}`);
  return data;
}

// ============================
// 🔹 UPLOAD API
// ============================

export async function uploadPdf(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ paper: Paper; localUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);

  // 1. Upload to S3
  const uploadRes = await api.post('/upload/pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    },
  });

  const { url } = uploadRes.data.data;

  // 2. Create paper record in DB
  const createRes = await api.post('/papers', {
    fileName: file.name,
    fileUrl: url,
    fileSize: file.size,
  });

  const paper = createRes.data.data;
  const localUrl = URL.createObjectURL(file);

  return {
    paper: { ...paper, localUrl },
    localUrl,
  };
}

// ============================
// 🔹 CONVERSATION API
// ============================

export async function createConversation(
  paperId: string,
  title?: string,
): Promise<ApiResponse<Conversation>> {
  const { data } = await api.post('/conversations', { paperId, title });
  return data;
}

export async function listConversations(
  paperId?: string,
): Promise<ApiResponse<Conversation[]>> {
  const params = paperId ? { paperId } : {};
  const { data } = await api.get('/conversations', { params });
  return data;
}

export async function getConversation(id: string): Promise<any> {
  const { data } = await api.get(`/conversations/${id}`);
  return data;
}

export async function deleteConversation(
  id: string,
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/conversations/${id}`);
  return data;
}

// ============================
// 🔹 CHAT API
// ============================

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

// Helper: Parse Citations from RAG response
function parseCitationsFromResponse(
  rawCitations: any[],
  activePaperId?: string,
): Citation[] {
  return rawCitations.map((t: any, i: number) => {
    // Get metadata from item or nested metadata object
    const meta = t.metadata ?? {};

    // Extract bounding box from various possible locations
    let parsedBBox: any = t.bbox ?? meta.bbox ?? null;
    if (typeof parsedBBox === 'string') {
      try {
        parsedBBox = JSON.parse(parsedBBox);
      } catch {
        parsedBBox = null;
      }
    }

    // Layout dimensions
    const layoutW =
      Number(
        t.layoutWidth ??
          t.layout_width ??
          meta.layout_width ??
          parsedBBox?.layout_width ??
          parsedBBox?.page_width ??
          612,
      ) || 612;
    const layoutH =
      Number(
        t.layoutHeight ??
          t.layout_height ??
          meta.layout_height ??
          parsedBBox?.layout_height ??
          parsedBBox?.page_height ??
          792,
      ) || 792;

    // Calculate rect if bbox exists
    let rect: Citation['rect'] | undefined;
    if (parsedBBox) {
      const x1 = Number(parsedBBox?.x1 ?? parsedBBox?.left ?? 0);
      const y1 = Number(parsedBBox?.y1 ?? parsedBBox?.top ?? 0);
      let x2 = Number(parsedBBox?.x2 ?? parsedBBox?.right ?? 0);
      let y2 = Number(parsedBBox?.y2 ?? parsedBBox?.bottom ?? 0);
      if (!x2 || x2 <= x1) x2 = x1 + (Number(parsedBBox?.width) || 1);
      if (!y2 || y2 <= y1) y2 = y1 + (Number(parsedBBox?.height) || 1);

      rect =
        layoutW > 0 && layoutH > 0
          ? {
              left: x1 / layoutW,
              top: y1 / layoutH,
              width: (x2 - x1) / layoutW,
              height: (y2 - y1) / layoutH,
            }
          : undefined;
    }

    // Extract page number from various possible fields
    const pageNum =
      t.pageNumber ?? t.page ?? meta.page_label ?? meta.page_start ?? null;

    return {
      paperId: activePaperId ?? '',
      page: pageNum,
      title:
        t.sectionTitle ??
        t.section_title ??
        meta.section_title ??
        t.type ??
        'Citation',
      snippet: t.snippet ?? t.text ?? '',
      sourceId: t.sourceId ?? t.source_id ?? `S${i + 1}`,
      rect,
      rawBBox: parsedBBox,
      layoutWidth: layoutW,
      layoutHeight: layoutH,
    };
  });
}

export async function sendQuery(
  conversationId: string,
  question: string,
  _activePaperId?: string,
): Promise<{ assistantMsg: ChatMessage; raw: any }> {
  const { data } = await api.post<AskQuestionResponse>('/chat/ask', {
    conversationId,
    question,
  });

  const citations = parseCitationsFromResponse(
    data.data.citations || [],
    _activePaperId,
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

export async function getMessageHistory(
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data } = await api.get(`/chat/messages/${conversationId}`);

  return data.data.map((m: any) => ({
    id: m.id,
    role: m.role.toLowerCase() as 'user' | 'assistant',
    content: m.content,
    imageUrl: m.imageUrl,
    // Map imageUrl to imageDataUrl for display (supports both S3 URLs and data URLs)
    imageDataUrl: m.imageUrl || undefined,
    modelName: m.modelName,
    tokenCount: m.tokenCount,
    createdAt: m.createdAt,
  }));
}

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
// 🔹 RAG DIRECT API (for features not in NestJS backend)
// ============================

import axios from 'axios';
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';

export async function getRelatedPapers(
  fileId: string,
): Promise<RelatedPapersResponse> {
  const { data } = await axios.post(`${RAG_API_URL}/related-papers`, {
    file_id: fileId,
  });
  return data;
}

export async function brainstormQuestions(fileId: string): Promise<string[]> {
  const { data } = await axios.post(`${RAG_API_URL}/brainstorm-questions`, {
    file_id: fileId,
  });
  return data.questions;
}

// ============================
// 🔹 SESSION HELPERS
// ============================

export async function startSession(
  paperId: string,
  _ragFileId?: string,
): Promise<{ conversationId: string }> {
  // Create a conversation for this paper
  const res = await createConversation(paperId);
  return {
    conversationId: res.data.id,
  };
}

// Legacy: Poll messages (kept for compatibility)
export async function pollMessages(conversationId: string) {
  const messages = await getMessageHistory(conversationId);
  return {
    messages,
    nextCursor: undefined,
  };
}
