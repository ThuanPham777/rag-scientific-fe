import { useState, useEffect } from 'react';
import PdfViewer from './PdfViewer';
import SummaryView from './SummaryView';
import type { Paper } from '../../utils/types';
import { sendQuery } from '../../services/api';
import { usePaperStore } from '../../store/usePaperStore';

type Props = {
  activePaper?: Paper;
};

export default function PdfPanel({ activePaper }: Props) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'summary'>('pdf');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { session, paper } = usePaperStore();

  // 🔹 Gọi API query để summarize
  const handleSummary = async () => {
    if (!session || !paper?.id) return;
    try {
      setIsLoading(true);
      // Gọi API query
      const { assistantMsg } = await sendQuery(
        session.id,
        "Summarize the content of this paper",
        paper.id
      );

      // Lưu kết quả
      setSummaryData({ summary: assistantMsg.content });
    } catch (error) {
      console.error("❌ Error summarizing paper:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Khi user chuyển sang tab Summary → tự động gọi API nếu chưa có summary
  useEffect(() => {
    if (activeTab === "summary" && !summaryData && !isLoading) {
      handleSummary();
    }
  }, [activeTab]);

  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* Tabs row */}
      <div className="px-4 pt-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex gap-6">
          <button
            className={`pb-3 font-medium transition-colors ${activeTab === "pdf"
              ? "border-b-2 border-orange-500 text-orange-500"
              : "text-gray-500 hover:text-orange-500"
              }`}
            onClick={() => setActiveTab("pdf")}
          >
            PDF file
          </button>
          <button
            className={`pb-3 font-medium transition-colors ${activeTab === "summary"
              ? "border-b-2 border-orange-500 text-orange-500"
              : "text-gray-500 hover:text-orange-500"
              }`}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "pdf" ? (
          <div className="flex-1 min-h-0">
            <PdfViewer
              fileUrl={activePaper?.localUrl}
              onAction={(action, payload) => {
                //console.log("PdfPanel: onAction called with:", action, payload);
                if (action === "explain" && payload.imageDataUrl) {
                  //console.log("Captured PNG:", payload.imageDataUrl.slice(0, 64), "...");
                }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center">
                  <div className="text-4xl mb-4 animate-spin">⏳</div>
                  <p>AI is summarizing the paper...</p>
                </div>
              </div>
            ) : summaryData ? (
              <SummaryView summaryData={summaryData} />
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
    </section>
  );
}
