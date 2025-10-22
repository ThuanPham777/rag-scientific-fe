import { API_BASE_URL } from "../config";
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
// 🔹 Upload one or many PDFs
// ============================
export async function uploadPdfs(
  files: File[],
  onProgress?: (pct: number) => void
) {
  const uploadedPapers: Paper[] = [];
  const total = files.length;
  let processed = 0;

  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const data = await res.json();

      uploadedPapers.push({
        id: data.file_id,
        name: data.filename || file.name,
        size: file.size,
        localUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      throw err;
    } finally {
      processed++;
      onProgress?.(Math.round((processed / total) * 100));
    }
  }

  return { papers: uploadedPapers };
}

// ============================
// 🔹 Send a query to backend
// ============================
export async function sendQuery(
  sessionId: string,
  message: string,
  activePaperId?: string
) {
  // 1️⃣ User message
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  };

  if (!SESSIONS[sessionId])
    SESSIONS[sessionId] = { messages: [], paperIds: [] };
  SESSIONS[sessionId].messages.push(userMsg);

  // 2️⃣ Request body
  const body = {
    file_id: activePaperId,
    question: message,
    include_context: true,
  };

  // 3️⃣ Fetch backend
  let data: any;
  try {
    const res = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Query failed (${res.status}): ${text}`);
    }

    data = await res.json();
  } catch (err) {
    console.error("❌ Query error:", err);
    throw err;
  }

  // 4️⃣ Parse citations (từ context.texts)
  const citations: Citation[] =
    data.context?.texts?.map((t: any, i: number) => ({
      paperId: activePaperId ?? "",
      page: i + 1,
      title: t.type,
      snippet: t.text.slice(0, 200) + (t.text.length > 200 ? "..." : ""),
    })) ?? [];

  // 5️⃣ Assistant message
  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: data.answer,
    citations,
    createdAt: new Date().toISOString(),
  };

  // 6️⃣ Save to session
  SESSIONS[sessionId].messages.push(assistantMsg);

  return { userMsg, assistantMsg };
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
