import api from "../config/axios";
import type { ChatMessage, Citation, Paper, RelatedPapersResponse } from "../utils/types";

// ============================
// 🔹 Local in-memory store
// ============================
let SESSIONS: Record<string, { messages: ChatMessage[]; paperIds: string[] }> = {};

// ============================
// 🔹 Start a chat session
// ============================
export async function startSession(paperIds: string[]) {
  const sessionId = crypto.randomUUID();
  SESSIONS[sessionId] = { messages: [], paperIds };
  return { sessionId, paperIds };
}

// ============================
// 🔹 Upload one PDF
// ============================
export async function uploadPdf(file: File, onProgress?: (pct: number) => void) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total) {
        const pct = Math.round((e.loaded * 100) / e.total);
        onProgress?.(pct);
      }
    },
  });

  const data = res.data;

  const uploadedPaper: Paper = {
    id: data.file_id,
    name: data.filename,
    size: file.size,
    localUrl: URL.createObjectURL(file),
  };

  return { paper: uploadedPaper };
}

// ============================
// 🔹 Helper: Parse Citations (UPDATED)
// ============================
function parseCitationsFromResponse(rawResponse: any, activePaperId?: string): Citation[] {
  // Gộp cả texts, images và tables từ context
  const images = rawResponse.context?.images ?? [];
  const tables = rawResponse.context?.tables ?? [];
  const texts = rawResponse.context?.texts ?? [];
  
  const allItems = [...texts, ...images, ...tables];

  return allItems.map((t: any, i: number) => {
    const locator = t.locator ?? {};
    const meta = t.metadata ?? {};

    // Parse bbox (string hoặc object)
    let parsedBBox: any = locator.bbox ?? meta.bbox ?? t.bbox ?? null;
    if (typeof parsedBBox === "string") {
      try {
        parsedBBox = JSON.parse(parsedBBox);
      } catch {
        parsedBBox = null;
      }
    }

    const layoutW =
      Number(
        parsedBBox?.layout_width ??
          parsedBBox?.page_width ??
          parsedBBox?.width ??
          612
      ) || 612;
    const layoutH =
      Number(
        parsedBBox?.layout_height ??
          parsedBBox?.page_height ??
          parsedBBox?.height ??
          792
      ) || 792;

    const x1 = Number(parsedBBox?.x1 ?? parsedBBox?.left ?? 0);
    const y1 = Number(parsedBBox?.y1 ?? parsedBBox?.top ?? 0);
    let x2 = Number(parsedBBox?.x2 ?? parsedBBox?.right ?? 0);
    let y2 = Number(parsedBBox?.y2 ?? parsedBBox?.bottom ?? 0);
    if (!x2 || x2 <= x1) x2 = x1 + (Number(parsedBBox?.width) || 1);
    if (!y2 || y2 <= y1) y2 = y1 + (Number(parsedBBox?.height) || 1);

    const rect =
      layoutW > 0 && layoutH > 0
        ? {
            left: x1 / layoutW,
            top: y1 / layoutH,
            width: (x2 - x1) / layoutW,
            height: (y2 - y1) / layoutH,
          }
        : undefined;

    return {
      paperId: activePaperId ?? "",
      page:
        t.page ??
        locator.page_label ??
        meta.page_label ??
        locator.page ??
        t.page_label ??
        i + 1,
      title: meta.section_title ?? t.type ?? "Citation",
      snippet: t.text,
      sourceId: t.source_id,
      rect,
      rawBBox: parsedBBox,
      layoutWidth: layoutW,
      layoutHeight: layoutH,
    };
  }) ?? [];
}

// ============================
// 🔹 Send a query to backend
// ============================
export async function sendQuery(
  sessionId: string,
  message: string,
  activePaperId?: string
) {
  // Request body
  const body = {
    file_id: activePaperId,
    question: message,
    include_context: true,
  };

  const { data } = await api.post("/query", body);
  const rawResponse = data;

  // Parse citations
  const citations = parseCitationsFromResponse(rawResponse, activePaperId);

  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: rawResponse.answer,
    citations,
    createdAt: new Date().toISOString(),
  };

  // Lưu message lại như cũ
  if (!SESSIONS[sessionId]) {
    SESSIONS[sessionId] = { messages: [], paperIds: [] };
  }
  SESSIONS[sessionId].messages.push(assistantMsg);

  return { assistantMsg, raw: rawResponse };
}

// ============================
// 🔹 Explain cropped region (image base64)
// ============================
export async function explainRegion(
  imageDataUrl: string, 
  fileId?: string, 
  pageNumber?: number 
) {
  // Extract base64 part after comma if data URL
  const commaIdx = imageDataUrl.indexOf(",");
  const image_b64 =
    commaIdx >= 0 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;

  const body: any = { 
    image_b64, 
    include_context: true 
  };
  
  if (fileId) body.file_id = fileId;
  if (pageNumber) body.page_number = pageNumber; 

  const { data } = await api.post("/explain-region", body);
  const rawResponse = data;

  // Parse citations
  const citations = parseCitationsFromResponse(rawResponse, fileId);

  // Tạo message đầy đủ cấu trúc
  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: rawResponse.answer || rawResponse.explanation,
    citations, 
    createdAt: new Date().toISOString(),
  };

  return { assistantMsg, raw: rawResponse };
}

// ============================
// 🔹 Poll messages
// ============================
export async function pollMessages(sessionId: string) {
  return {
    messages: SESSIONS[sessionId]?.messages ?? [],
    nextCursor: undefined,
  };
}

// ============================
// 🔹 Get Related Papers
// ============================
export async function getRelatedPapers(fileId: string) {
  const { data } = await api.post("/related-papers", { file_id: fileId });
  return data as RelatedPapersResponse;
}

// ============================
// 🔹 Brainstorm Questions
// ============================
export async function brainstormQuestions(fileId: string) {
  const { data } = await api.post("/brainstorm-questions", { file_id: fileId });
  return data.questions as string[];
}