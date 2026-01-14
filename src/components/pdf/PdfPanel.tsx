import { useState, useEffect } from "react";
import PdfViewer from "./PdfViewer";
import SummaryView from "./SummaryView";
import RelatedPapersView from "./RelatedPapersView";
import type { Paper, RelatedPapersResponse } from "../../utils/types";
import { sendQuery, explainRegion, getRelatedPapers } from "../../services/api";
import { usePaperStore } from "../../store/usePaperStore";

type Props = {
  activePaper?: Paper;
  onPdfAction?: (action: "explain" | "summarize", selectedText: string) => void;
};

type PendingJump = {
  pageNumber: number;
  rect?: { top: number; left: number; width: number; height: number };
};

type ActiveTab = "pdf" | "summary" | "related";

export default function PdfPanel({ activePaper, onPdfAction }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pdf");
  
  // Data states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [relatedData, setRelatedData] = useState<RelatedPapersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { session, paper, pendingJump, setPendingJump } = usePaperStore() as {
    session: any;
    paper: { id: string } | null;
    pendingJump: PendingJump | null;
    setPendingJump: (val: PendingJump | null) => void;
  };

  // --- Logic 1: Summary ---
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

  // --- Logic 2: Related Papers ---
  const handleRelated = async () => {
    if (!paper?.id) return;
    try {
      setIsLoading(true);
      const data = await getRelatedPapers(paper.id);
      setRelatedData(data);
    } catch (error) {
      console.error("❌ Error fetching related papers:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect switch tab logic
  useEffect(() => {
    if (activeTab === "summary" && !summaryData && !isLoading) {
      handleSummary();
    }
    if (activeTab === "related" && !relatedData && !isLoading) {
      handleRelated();
    }
  }, [activeTab, summaryData, relatedData, isLoading, paper?.id]);

  // --- FIX 1: Tự động chuyển tab PDF khi có lệnh jump từ bên ngoài (Chat) ---
  useEffect(() => {
    // Nếu store có pendingJump mà đang KHÔNG ở tab PDF
    // -> Chuyển ngay về tab PDF để PdfViewer nhận được props và thực hiện scroll
    if (pendingJump && activeTab !== 'pdf') {
      setActiveTab('pdf');
    }
  }, [pendingJump, activeTab]);

  // --- FIX 2: Cleanup Pending Jump ---
  useEffect(() => {
    if (pendingJump && activeTab === 'pdf') {
      // Khi đã ở tab PDF và có pendingJump, chờ 1s rồi clear
      // Thời gian này đủ để PdfViewer nhận props và scroll/highlight
      const timer = setTimeout(() => {
        setPendingJump(null);
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [pendingJump, activeTab, setPendingJump]);

  const renderTabBtn = (tabName: ActiveTab, label: string) => (
    <button
      className={`pb-3 font-medium transition-colors border-b-2 px-1 ${
        activeTab === tabName
          ? "border-orange-500 text-orange-600"
          : "border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-200"
      }`}
      onClick={() => setActiveTab(tabName)}
    >
      {label}
    </button>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header Tabs */}
      <div className="px-4 pt-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex gap-6">
          {renderTabBtn("pdf", "PDF File")}
          {renderTabBtn("summary", "Summary")}
          {renderTabBtn("related", "Related Papers")}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        
        {/* === TAB: PDF (KEEP ALIVE) === */}
        {/* Dùng 'hidden' để giữ PDF viewer luôn được mount (không bị reload) */}
        <div className={`flex-1 min-h-0 flex flex-col ${activeTab === 'pdf' ? '' : 'hidden'}`}>
          <PdfViewer
            fileUrl={activePaper?.localUrl}
            // Truyền pendingJump vào component con
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
                const pageNumber = (payload as any).pageNumber as number;
                const fileId = paper?.id;

                usePaperStore.getState().addMessage({
                  id: crypto.randomUUID(),
                  role: "user",
                  content: "Explain this region",
                  imageDataUrl,
                  createdAt: new Date().toISOString(),
                });

                explainRegion(imageDataUrl, fileId, pageNumber)
                  .then(({ assistantMsg }) => {
                    usePaperStore.getState().addMessage(assistantMsg);
                  })
                  .catch((err) => {
                    console.error("❌ Explain error:", err);
                    usePaperStore.getState().addMessage({
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: "⚠️ Sorry, something went wrong.",
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

        {/* === TAB: SUMMARY === */}
        {activeTab === "summary" && (
          <div className="flex-1 overflow-auto p-0">
            {isLoading && !summaryData ? (
              <LoadingView message="AI is summarizing the paper..." />
            ) : summaryData ? (
              <SummaryView
                summaryData={summaryData}
                onJumpToSource={({ pageNumber, rect }) => {
                  // Set jump data -> Trigger useEffect ở trên -> Chuyển tab
                  setPendingJump({ pageNumber, rect });
                }}
              />
            ) : (
              <EmptyView 
                icon="🧠" 
                message="Click Summary to analyze the paper content." 
              />
            )}
          </div>
        )}

        {/* === TAB: RELATED PAPERS === */}
        {activeTab === "related" && (
          <div className="flex-1 overflow-auto p-0">
            {isLoading && !relatedData ? (
              <LoadingView message="Searching for related papers..." />
            ) : relatedData ? (
              <RelatedPapersView data={relatedData} />
            ) : (
              <EmptyView 
                icon="🔍" 
                message="Click Related Papers to discover similar research." 
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-600">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}

function EmptyView({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <div className="text-5xl mb-4 grayscale opacity-70">{icon}</div>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}