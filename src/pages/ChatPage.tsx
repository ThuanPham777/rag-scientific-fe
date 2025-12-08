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
  
  // State lưu context của câu hỏi gần nhất để highlight
  const [lastQueryContexts, setLastQueryContexts] = useState<any[]>([]);

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

      // Lấy raw response để lấy context bbox
      const { assistantMsg, raw } = await sendQuery(session.id, text, paper?.id);

      // Cập nhật context highlight
      if (raw?.context?.texts) {
        setLastQueryContexts(raw.context.texts);
      }

      addMessage(assistantMsg);
    } catch (err: any) {
      console.error("❌ Chat error:", err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Sorry, something went wrong while processing your question.",
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfAction = async (
    action: 'explain' | 'summarize',
    selectedText: string
  ) => {
    if (!session || !selectedText.trim()) return;

    const queryText =
      action === 'explain'
        ? `Explain the following text: "${selectedText}"`
        : `Summarize the following text: "${selectedText}"`;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: queryText,
      createdAt: new Date().toISOString(),
    };

    addMessage(userMsg);

    try {
      setLoading(true);

      const { assistantMsg, raw } = await sendQuery(
        session.id,
        queryText,
        paper?.id
      );

      // Cập nhật context highlight
      if (raw?.context?.texts) {
        setLastQueryContexts(raw.context.texts);
      }

      console.log("call api success", assistantMsg);
      addMessage(assistantMsg);
    } catch (err: any) {
      console.error("❌ PDF action error:", err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Sorry, something went wrong while processing your request.",
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-8 pl-4 pb-8 pr-4 max-w-screen-2xl mx-auto flex flex-col gap-2">
      <div className="h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 px-3">
        <PdfPanel 
          activePaper={paper} 
          onPdfAction={handlePdfAction} 
          chatContexts={lastQueryContexts}
          // 🔥 MỚI: Reset context khi user click ngoài khoảng trắng trong PDF
          onClearContexts={() => setLastQueryContexts([])}
        />
        <div className="hidden lg:block" aria-hidden />
      </div>

      <ChatDock session={session} onSend={onSend} isLoading={loading} defaultOpen={true} />
    </div>
  );
}