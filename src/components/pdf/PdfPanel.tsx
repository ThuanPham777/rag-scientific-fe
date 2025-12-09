// src/components/pdf/PdfPanel.tsx
import { useState, useEffect } from "react";
import PdfViewer from "./PdfViewer";
import SummaryView from "./SummaryView";
import type { Paper } from "../../utils/types";
import { sendQuery, explainRegion } from "../../services/api";
import { usePaperStore } from "../../store/usePaperStore";

type Props = {
  activePaper?: Paper;
  onPdfAction?: (action: "explain" | "summarize", selectedText: string) => void;
};

type PendingJump = {
  pageNumber: number;
  rect?: { top: number; left: number; width: number; height: number };
};

export default function PdfPanel({ activePaper, onPdfAction }: Props) {
  const [activeTab, setActiveTab] = useState<"pdf" | "summary">("pdf");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { session, paper, pendingJump, setPendingJump } = usePaperStore() as {
    session: any;
    paper: { id: string } | null;
    pendingJump: PendingJump | null;
    setPendingJump: (val: PendingJump | null) => void;
  };

  const handleSummary = async () => {
    if (!session || !paper?.id) return;
    try {
      setIsLoading(true);
      const { assistantMsg, raw } = await sendQuery(
        session.id,
        "Summarize the content of this paper",
        paper.id
      );
      const payload = raw ?? { answer: assistantMsg.content };
      setSummaryData(payload);
    } catch (error) {
      console.error("❌ Error summarizing paper:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === "summary" && !summaryData && !isLoading) {
      handleSummary();
    }
  }, [activeTab, summaryData, isLoading]);

  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 pt-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex gap-6">
          <button
            className={`pb-3 font-medium transition-colors ${
              activeTab === "pdf"
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-500 hover:text-orange-500"
            }`}
            onClick={() => setActiveTab("pdf")}
          >
            PDF file
          </button>
          <button
            className={`pb-3 font-medium transition-colors ${
              activeTab === "summary"
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-gray-500 hover:text-orange-500"
            }`}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "pdf" ? (
          <div className="flex-1 min-h-0">
            <PdfViewer
              fileUrl={activePaper?.localUrl}
              jumpToPage={pendingJump?.pageNumber}
              jumpHighlight={
                pendingJump?.rect && pendingJump.pageNumber
                  ? {
                      pageNumber: pendingJump.pageNumber,
                      rect: pendingJump.rect,
                    }
                  : undefined
              }
              onAction={(action, payload) => {
                if (!session) return;

                if (action === "explain" && (payload as any).imageDataUrl) {
                  const imageDataUrl = (payload as any).imageDataUrl as string;
                  const fileId = paper?.id;

                  usePaperStore.getState().addMessage({
                    id: crypto.randomUUID(),
                    role: "user",
                    content: "Explain this region",
                    imageDataUrl,
                    createdAt: new Date().toISOString(),
                  });

                  explainRegion(imageDataUrl, fileId)
                    .then(({ explanation }) => {
                      usePaperStore.getState().addMessage({
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: explanation || "No explanation available.",
                        createdAt: new Date().toISOString(),
                      });
                    })
                    .catch((err) => {
                      console.error("❌ Explain error:", err);
                      usePaperStore.getState().addMessage({
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "⚠️ Sorry, something went wrong while explaining the selected region.",
                        createdAt: new Date().toISOString(),
                      });
                    });
                  return;
                }

                if (
                  (action === "explain" || action === "summarize") &&
                  (payload as any).text
                ) {
                  onPdfAction?.(action, (payload as any).text);
                  return;
                }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center">
                  <div className="text-4xl mb-4 animate-spin">⏳</div>
                  <p>AI is summarizing the paper...</p>
                </div>
              </div>
            ) : summaryData ? (
              <SummaryView
                summaryData={summaryData}
                onJumpToSource={({ pageNumber, rect }) => {
                  setActiveTab("pdf");
                  setPendingJump({ pageNumber, rect });
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">🧠</div>
                  <p>Click Summary to analyze the paper content.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {pendingJump && (
        <span style={{ display: "none" }}>
          {setTimeout(() => setPendingJump(null), 0)}
        </span>
      )}
    </section>
  );
}