// src/services/api.ts (mocked)

import type { ChatMessage, Citation, Paper } from '../utils/types';

// in-memory store (per tab)
let FAKE_PAPERS: Paper[] = [];
let SESSIONS: Record<string, { messages: ChatMessage[]; paperIds: string[] }> =
  {};

export async function uploadPdfs(
  files: File[],
  onProgress?: (pct: number) => void
) {
  let loaded = 0;
  const total = files.reduce((s, f) => s + f.size, 0) || 10;
  const tick = () => {
    loaded = Math.min(total, loaded + total / 8);
    onProgress?.(Math.round((loaded / total) * 100));
  };
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 80));
    tick();
  }

  FAKE_PAPERS = files.map((f) => ({
    id: crypto.randomUUID(),
    name: f.name,
    size: f.size,
    localUrl: URL.createObjectURL(f), // <-- quan trọng
  }));
  return { papers: FAKE_PAPERS };
}

export async function startSession(paperIds: string[]) {
  const sessionId = crypto.randomUUID();
  SESSIONS[sessionId] = { messages: [], paperIds };
  return { sessionId };
}

export async function sendQuery(
  sessionId: string,
  message: string,
  activePaperId?: string
) {
  // Push user message
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: message,
    createdAt: new Date().toISOString(),
  };
  SESSIONS[sessionId].messages.push(userMsg);

  // Fake assistant answer
  const answer = fakeRagAnswer(message, activePaperId);
  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: answer.text,
    citations: answer.citations,
    createdAt: new Date().toISOString(),
  };

  await new Promise((r) => setTimeout(r, 500));
  SESSIONS[sessionId].messages.push(assistantMsg);
  return { messageId: assistantMsg.id };
}

export async function pollMessages(sessionId: string) {
  return {
    messages: SESSIONS[sessionId]?.messages ?? [],
    nextCursor: undefined,
  };
}

function fakeRagAnswer(
  q: string,
  paperId?: string
): { text: string; citations?: Citation[] } {
  const canned = [
    `Here is a brief summary based on your upload. The paper discusses an e-learning framework, methodology, and results.

• Objective: evaluate platform usability
• Methods: mixed (survey + log data)
• Key results: positive learning outcomes
• Limitations: small sample, single course`,
    `Main contributions:
1) Clear taxonomy of features
2) Lightweight pipeline for PDF parsing
3) Open dataset for replication`,
    `Limitations include small sample size, potential annotation bias, and restricted generalization beyond the studied cohort.`,
  ];

  const text = canned[Math.floor(Math.random() * canned.length)];
  const citations: Citation[] = paperId
    ? [
      { paperId, page: 3, title: 'Methodology' },
      { paperId, page: 14, title: 'Results' },
    ]
    : [];
  return { text, citations };
}
