// src/pages/ChatPage.tsx
import { useState } from "react";
import { usePaperStore } from "../store/usePaperStore";
import { sendQuery } from "../services/api";
import PdfPanel from "../components/pdf/PdfPanel";
import ChatDock from "../components/chat/ChatDock";
import type { ChatMessage } from "../utils/types";

export default function ChatPage() {
  const { session, paper, addMessage } = usePaperStore();
  const [loading, setLoading] = useState(false);

  if (!session)
    return (
      <div className="min-h-[calc(100vh-4rem)] pl-16 pt-16 flex items-center justify-center text-gray-600">
        No session. Go back and upload a PDF file.
      </div>
    );


  const onSend = async (text: string) => {
    if (!text.trim() || !session) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    addMessage(userMsg);

    try {
      setLoading(true);

      const { assistantMsg } = await sendQuery(session.id, text, paper?.id);

      addMessage(assistantMsg);
    } catch (err: any) {
      console.error("❌ Chat error:", err);

      // 4️⃣ Thêm thông báo lỗi vào chat
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "⚠️ Sorry, something went wrong while processing your question.",
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý action từ PDF (explain, summarize)
  const handlePdfAction = async (
    action: 'explain' | 'summarize',
    selectedText: string
  ) => {
    if (!session || !selectedText.trim()) return;

    // Tạo query text dựa trên action
    const queryText =
      action === 'explain'
        ? `Explain the following text: "${selectedText}"`
        : `Summarize the following text: "${selectedText}"`;

    // Tạo user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: queryText,
      createdAt: new Date().toISOString(),
    };

    addMessage(userMsg);

    try {
      setLoading(true);

      const { assistantMsg } = await sendQuery(
        session.id,
        queryText,
        paper?.id
      );

      console.log("call api success 12345", assistantMsg);

      addMessage(assistantMsg);
    } catch (err: any) {
      console.error("❌ PDF action error:", err);

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "⚠️ Sorry, something went wrong while processing your request.",
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-8 pl-4 pb-8 pr-4 max-w-screen-2xl mx-auto flex flex-col gap-2">
      {/* Lưới 2 cột: bên trái PDF, bên phải chừa chỗ cho khung chat nổi */}
      <div className="h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 px-3">
        <PdfPanel activePaper={paper} onPdfAction={handlePdfAction} />
        <div className="hidden lg:block" aria-hidden /> {/* spacer phải */}
      </div>

      {/* Chat nổi cố định */}
      <ChatDock session={session} onSend={onSend} isLoading={loading} />
    </div>
  );
}
