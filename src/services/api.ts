import api from "../config/axios";
import type { ChatMessage, Citation, Paper } from "../utils/types";

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

  // 4️⃣ Parse citations (từ context.texts)
  const citations: Citation[] =
    data.context?.texts?.map((t: any, i: number) => ({
      paperId: activePaperId ?? "",
      page: i + 1,
      title: t.type,
      snippet: t.text.slice(0, 200) + (t.text.length > 200 ? "..." : ""),
    })) ?? [];

  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: data.answer,
    citations,
    createdAt: new Date().toISOString(),
  };

  // Save assistant message to session (for consistency)
  if (!SESSIONS[sessionId])
    SESSIONS[sessionId] = { messages: [], paperIds: [] };
  SESSIONS[sessionId].messages.push(assistantMsg);

  return { assistantMsg };
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
