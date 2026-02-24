import { useState, useEffect } from 'react';
import SummaryView from './SummaryView';
import RelatedPapersView from './RelatedPapersView';
import type {
  Paper,
  RelatedPapersResponse,
  SummaryResult,
} from '../../utils/types';
import {
  getRelatedPapers,
  getPaperSummary,
  guestExplainRegion,
  buildGuestAssistantMessage,
} from '../../services';
import { usePaperStore } from '../../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { useGuestLimitStore } from '../../store/useGuestLimitStore';
import PdfViewer from './PdfViewer';
import notebookService from '@/services/notebookService';
import AuthModal from '@/components/auth/AuthModal';

type Props = {
  activePaper?: Paper;
  onPdfAction?: (action: 'explain' | 'summarize', selectedText: string) => void;
  // Chat dock integration for fullscreen mode
  isChatDockOpen?: boolean;
  chatDockWidth?: number;
  // Callback when fullscreen state changes
  onFullscreenChange?: (isFullscreen: boolean) => void;
  // Callback to expose capture toggle function to parent
  onCaptureRefChange?: (toggleCapture: () => void) => void;
  // Callback for explain region capture (image) — handled by parent (ChatPage)
  onExplainRegionCapture?: (
    imageDataUrl: string,
    pageNumber: number,
    completeProcessing?: () => void,
  ) => void;
};

type PendingJump = {
  pageNumber: number;
  rect?: { top: number; left: number; width: number; height: number };
};

type ActiveTab = 'pdf' | 'summary' | 'related';

export default function PdfPanel({
  activePaper,
  onPdfAction,
  isChatDockOpen = true,
  chatDockWidth = 550,
  onFullscreenChange,
  onCaptureRefChange,
  onExplainRegionCapture,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pdf');

  // Data states
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedPapersResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  // Track if fetch has been attempted (to prevent infinite retry on error)
  const [summaryFetched, setSummaryFetched] = useState(false);
  const [relatedFetched, setRelatedFetched] = useState(false);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);

  const currentPaper = usePaperStore((s) => s.currentPaper);
  const currentConversationId = usePaperStore((s) => s.currentConversationId);
  const sessionMeta = usePaperStore((s) => s.sessionMeta);
  const pendingJump: PendingJump | null = usePaperStore((s) => s.pendingJump);
  const paperSetPendingJump = usePaperStore((s) => s.setPendingJump);

  // Build session object from store state for compatibility
  const session = currentConversationId
    ? {
        id: currentConversationId,
        paperId: sessionMeta?.paperId,
        ragFileId: sessionMeta?.ragFileId,
      }
    : null;

  // Use currentPaper as the paper reference
  const paper = currentPaper;

  // Guest store for pendingJump
  const guestPendingJump = useGuestStore((s) => s.pendingJump);
  const guestSetPendingJump = useGuestStore((s) => s.setPendingJump);
  const guestSession = useGuestStore((s) => s.currentSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Determine if guest mode
  const isGuest =
    !isAuthenticated && guestSession?.id && isGuestSession(guestSession.id);

  // Use appropriate pendingJump based on mode
  const activePendingJump = isGuest ? guestPendingJump : pendingJump;
  const setPendingJump = isGuest ? guestSetPendingJump : paperSetPendingJump;

  // --- Logic 1: Summary ---
  const handleSummary = async () => {
    if (!paper?.id) return;
    setSummaryFetched(true); // Mark as attempted
    try {
      setIsLoading(true);
      const res = await getPaperSummary(paper.id);
      setSummaryData(res.data);
    } catch (error) {
      console.error('❌ Error summarizing paper:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logic 2: Related Papers ---
  const handleRelated = async () => {
    if (!paper?.id) {
      console.error('❌ No paper ID found');
      return;
    }
    setRelatedFetched(true); // Mark as attempted
    try {
      setIsLoading(true);
      const data = await getRelatedPapers(paper.id);
      setRelatedData(data.data);
    } catch (error) {
      console.error('❌ Error fetching related papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect switch tab logic - only fetch if not already attempted
  useEffect(() => {
    if (
      activeTab === 'summary' &&
      !summaryData &&
      !summaryFetched &&
      !isLoading &&
      paper?.id
    ) {
      handleSummary();
    }
    if (
      activeTab === 'related' &&
      !relatedData &&
      !relatedFetched &&
      !isLoading &&
      paper?.ragFileId
    ) {
      handleRelated();
    }
  }, [
    activeTab,
    summaryFetched,
    relatedFetched,
    isLoading,
    paper?.ragFileId,
    paper?.id,
  ]);

  // Reset fetch flags when paper changes
  useEffect(() => {
    setSummaryData(null);
    setRelatedData(null);
    setSummaryFetched(false);
    setRelatedFetched(false);
  }, [paper?.id]);

  // --- FIX 1: Tự động chuyển tab PDF khi có lệnh jump từ bên ngoài (Chat) ---
  useEffect(() => {
    // Nếu store có pendingJump mà đang KHÔNG ở tab PDF
    // -> Chuyển ngay về tab PDF để PdfViewer nhận được props và thực hiện scroll
    if (activePendingJump) {
      console.log('[PdfPanel] pendingJump detected:', activePendingJump);
    }
    if (activePendingJump && activeTab !== 'pdf') {
      console.log('[PdfPanel] Switching to PDF tab due to pendingJump');
      setActiveTab('pdf');
    }
  }, [activePendingJump, activeTab]);

  // --- FIX 2: Cleanup Pending Jump ---
  useEffect(() => {
    if (activePendingJump && activeTab === 'pdf') {
      // Khi đã ở tab PDF và có pendingJump, chờ để PdfViewer nhận props và scroll/highlight
      // Tăng lên 10s để đảm bảo PDF có đủ thời gian load (đặc biệt khi mở tab mới từ multi-paper chat)
      console.log('[PdfPanel] Starting cleanup timer for pendingJump (10s)');
      const timer = setTimeout(() => {
        console.log('[PdfPanel] Clearing pendingJump after timeout');
        setPendingJump(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activePendingJump, activeTab, setPendingJump]);

  const renderTabBtn = (tabName: ActiveTab, label: string) => (
    <button
      className={`pb-3 font-medium transition-colors border-b-2 px-1 ${
        activeTab === tabName
          ? 'border-orange-500 text-orange-600'
          : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-200'
      }`}
      onClick={() => {
        // Restrict Summary & Related tabs for guest users
        if (
          !isAuthenticated &&
          (tabName === 'summary' || tabName === 'related')
        ) {
          setShowGuestAuthModal(true);
          return;
        }
        setActiveTab(tabName);
      }}
    >
      {label}
    </button>
  );

  // Guest auth modal handler
  const handleGuestLoginSuccess = () => {
    const guestSession = useGuestStore.getState().currentSession;
    if (guestSession) {
      window.location.href = `/chat/${guestSession.id}`;
    }
  };

  return (
    <section className='bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full'>
      {/* Header Tabs */}
      <div className='px-4 pt-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <div className='flex gap-6'>
          {renderTabBtn('pdf', 'PDF File')}
          {renderTabBtn('summary', 'Summary')}
          {renderTabBtn('related', 'Related Papers')}
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 flex flex-col min-h-0 relative'>
        {/* === TAB: PDF (KEEP ALIVE) === */}
        {/* Dùng 'hidden' để giữ PDF viewer luôn được mount (không bị reload) */}
        <div
          className={`flex-1 min-h-0 flex flex-col ${activeTab === 'pdf' ? '' : 'hidden'}`}
        >
          <PdfViewer
            fileUrl={activePaper?.localUrl || activePaper?.fileUrl}
            paperId={activePaper?.id}
            // Truyền pendingJump vào component con
            jumpToPage={activePendingJump?.pageNumber}
            jumpHighlight={
              activePendingJump?.rect && activePendingJump.pageNumber
                ? {
                    pageNumber: activePendingJump.pageNumber,
                    rect: activePendingJump.rect,
                  }
                : undefined
            }
            // Chat dock integration for fullscreen mode
            isChatDockOpen={isChatDockOpen}
            chatDockWidth={chatDockWidth}
            onFullscreenChange={onFullscreenChange}
            // Expose capture toggle function to parent
            onCaptureRefChange={onCaptureRefChange}
            onAction={(action, payload) => {
              // Handle 'save to notebook' early — auto-create a new notebook
              if (action === 'save' && (payload as any).text) {
                const selectedText = (payload as any).text as string;
                const paperTitle =
                  activePaper?.title || activePaper?.fileName || 'PDF';
                (async () => {
                  try {
                    const created = await notebookService.create({
                      title: `Note from ${paperTitle}`,
                      content: `<p>${selectedText}</p>`,
                    });
                    const { openNotebooks, setPendingNotebookId } =
                      useUiStore.getState();
                    setPendingNotebookId(created.id);
                    openNotebooks();
                  } catch (err) {
                    console.error('Failed to save to notebook', err);
                  }
                })();
                return;
              }

              // Check if guest mode (from localStorage) or authenticated
              const isAuthenticated = useAuthStore.getState().isAuthenticated;
              const guestSession = useGuestStore.getState().currentSession;
              const guestPaper = useGuestStore.getState().currentPaper;
              const isGuest =
                !isAuthenticated &&
                guestSession?.id &&
                isGuestSession(guestSession.id);

              // For guests, use guest session; for auth users, require session
              if (!isGuest && !session) return;

              if (action === 'explain' && (payload as any).imageDataUrl) {
                const imageDataUrl = (payload as any).imageDataUrl as string;
                const pageNumber = (payload as any).pageNumber as number;
                const completeProcessing = (payload as any)
                  .__completeProcessing as (() => void) | undefined;

                if (isGuest && guestPaper?.ragFileId) {
                  // ── Guest AI limit gate ──
                  if (!useGuestLimitStore.getState().tryUseAiRequest()) {
                    setShowGuestAuthModal(true);
                    completeProcessing?.();
                    return;
                  }

                  // Guest mode: use guestExplainRegion
                  const guestStore = useGuestStore.getState();

                  guestStore.addGuestMessage({
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: 'Explain this region',
                    imageDataUrl,
                    createdAt: new Date().toISOString(),
                  });

                  guestStore.setLoading(true);

                  guestExplainRegion(
                    guestPaper.ragFileId,
                    imageDataUrl,
                    pageNumber,
                  )
                    .then(({ answer, citations, raw }) => {
                      const assistantMsg = buildGuestAssistantMessage(
                        answer,
                        citations,
                        raw.modelName,
                        raw.tokenCount,
                      );
                      guestStore.addGuestMessage(assistantMsg);
                    })
                    .catch((err) => {
                      console.error('❌ Guest Explain error:', err);
                      guestStore.addGuestMessage({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: '⚠️ Sorry, something went wrong.',
                        createdAt: new Date().toISOString(),
                      });
                    })
                    .finally(() => {
                      guestStore.setLoading(false);
                      completeProcessing?.();
                    });
                  return;
                }

                // Authenticated mode: delegate to parent (ChatPage) to reuse
                // the same sentMessages pipeline as normal text messages
                if (onExplainRegionCapture) {
                  onExplainRegionCapture(
                    imageDataUrl,
                    pageNumber,
                    completeProcessing,
                  );
                }
                return;
              }

              if (
                (action === 'explain' || action === 'summarize') &&
                (payload as any).text
              ) {
                onPdfAction?.(action, (payload as any).text);
                return;
              }
            }}
          />
        </div>

        {/* === TAB: SUMMARY === */}
        {activeTab === 'summary' && (
          <div className='flex-1 overflow-auto p-0'>
            {isLoading && !summaryData ? (
              <LoadingView message='AI is summarizing the paper...' />
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
                icon='🧠'
                message='Click Summary to analyze the paper content.'
              />
            )}
          </div>
        )}

        {/* === TAB: RELATED PAPERS === */}
        {activeTab === 'related' && (
          <div className='flex-1 overflow-auto p-0'>
            {isLoading && !relatedData ? (
              <LoadingView message='Searching for related papers...' />
            ) : relatedData ? (
              <RelatedPapersView data={relatedData} />
            ) : (
              <EmptyView
                icon='🔍'
                message='Click Related Papers to discover similar research.'
              />
            )}
          </div>
        )}
      </div>

      {/* Guest Auth Modal */}
      <AuthModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        initialMode='login'
        onLoginSuccess={handleGuestLoginSuccess}
      />
    </section>
  );
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className='flex items-center justify-center h-full text-gray-600'>
      <div className='text-center'>
        <div className='text-4xl mb-4 animate-spin'>⏳</div>
        <p className='font-medium'>{message}</p>
      </div>
    </div>
  );
}

function EmptyView({ icon, message }: { icon: string; message: string }) {
  return (
    <div className='flex items-center justify-center h-full text-gray-400'>
      <div className='text-center'>
        <div className='text-5xl mb-4 grayscale opacity-70'>{icon}</div>
        <p className='font-medium'>{message}</p>
      </div>
    </div>
  );
}
