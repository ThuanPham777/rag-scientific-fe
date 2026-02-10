// src/pages/ChatPage.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { usePaperStore } from '../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  useClearChatHistory,
  useGenerateFollowUpQuestions,
  useInfiniteMessageHistory,
  flattenMessagePages,
} from '../hooks';
import {
  sendQuery,
  getConversation,
  getPaper,
  guestAskQuestion,
  guestCheckIngestStatus,
  buildGuestAssistantMessage,
  explainRegion,
} from '../services';
import PdfPanel from '../components/pdf/PdfPanel';
import ChatDock from '../components/chat/ChatDock';
import type { ChatMessage } from '../utils/types';

export default function ChatPage() {
  const { conversationId: urlConversationId } = useParams<{
    conversationId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Use new API from usePaperStore
  const currentPaper = usePaperStore((s) => s.currentPaper);
  const currentConversationId = usePaperStore((s) => s.currentConversationId);
  const sessionMeta = usePaperStore((s) => s.sessionMeta);
  const isChatLoading = usePaperStore((s) => s.isChatLoading);
  const setCurrentPaper = usePaperStore((s) => s.setCurrentPaper);
  const setSession = usePaperStore((s) => s.setSession);
  const setChatLoading = usePaperStore((s) => s.setChatLoading);
  const setPendingJump = usePaperStore((s) => s.setPendingJump);
  const updateCurrentPaper = usePaperStore((s) => s.updateCurrentPaper);

  // Build session object from store state
  const session = currentConversationId
    ? {
        id: currentConversationId,
        paperId: sessionMeta?.paperId,
        ragFileId: sessionMeta?.ragFileId,
        title: sessionMeta?.title,
        messages: [] as ChatMessage[],
      }
    : null;

  // Guest store
  const {
    currentSession: guestSession,
    currentPaper: guestPaper,
    addGuestMessage,
    setGuestMessages,
    isLoading: guestIsLoading,
    setLoading: setGuestLoading,
  } = useGuestStore();

  // Clear chat history mutation (for authenticated users)
  const clearChatHistoryMutation = useClearChatHistory();

  // Follow-up questions: mutation + local map keyed by messageId
  const followUpMutation = useGenerateFollowUpQuestions();
  const [followUpMap, setFollowUpMap] = useState<Record<string, string[]>>({});

  // Determine if this is a guest session by checking localStorage
  const isGuest = urlConversationId
    ? !isAuthenticated && isGuestSession(urlConversationId)
    : !isAuthenticated;

  // Use guest or authenticated session/paper
  const activeSession = isGuest ? guestSession : session;
  const activePaper = isGuest
    ? guestPaper
      ? {
          id: guestPaper.id,
          ragFileId: guestPaper.ragFileId,
          fileName: guestPaper.fileName,
          fileUrl: guestPaper.fileUrl,
          localUrl: guestPaper.fileUrl,
          status: (guestPaper.status || 'COMPLETED') as
            | 'PROCESSING'
            | 'COMPLETED'
            | 'FAILED',
          createdAt: guestPaper.createdAt,
          updatedAt: guestPaper.createdAt,
          userId: '',
        }
      : undefined
    : (currentPaper ?? undefined);

  // Start as true if we have urlConversationId but no session (need to restore)
  const [initialLoading, setInitialLoading] = useState(() => {
    if (!urlConversationId) return false;
    // Check if guest session exists in localStorage
    const guestStore = useGuestStore.getState();
    if (guestStore.currentSession?.id === urlConversationId) {
      return false; // Guest session found
    }
    // Authenticated session - check paper store
    const paperStore = usePaperStore.getState();
    if (paperStore.currentConversationId === urlConversationId) {
      return false;
    }
    return true; // Need to restore
  });

  // State for ChatDock open status (for fullscreen PDF viewer integration)
  // MUST be defined before any early returns to follow Rules of Hooks
  const [isChatDockOpen, setIsChatDockOpen] = useState(true);
  // State for PDF fullscreen mode
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const CHAT_DOCK_WIDTH = 500;

  // Capture function - will be set by PdfPanel
  const captureToggleRef = useRef<(() => void) | null>(null);

  // Restore session from URL on mount/reload
  useEffect(() => {
    // Wait for auth to be initialized before trying to restore session
    if (!isInitialized) return;

    const restoreSession = async () => {
      // Check if guest session exists in localStorage
      const guestStore = useGuestStore.getState();
      if (
        urlConversationId &&
        guestStore.currentSession?.id === urlConversationId &&
        guestStore.currentPaper
      ) {
        // Session found in localStorage, sync to paper store for PDF viewer
        setCurrentPaper({
          id: guestStore.currentPaper.id,
          ragFileId: guestStore.currentPaper.ragFileId,
          fileName: guestStore.currentPaper.fileName,
          fileUrl: guestStore.currentPaper.fileUrl,
          localUrl: guestStore.currentPaper.fileUrl,
          status: guestStore.currentPaper.status || 'COMPLETED',
          createdAt: guestStore.currentPaper.createdAt,
          updatedAt: guestStore.currentPaper.createdAt,
          userId: '',
        } as any);

        setSession({
          id: guestStore.currentSession.id,
          paperId: guestStore.currentSession.paperId,
          ragFileId: guestStore.currentSession.ragFileId,
          messages: guestStore.currentSession.messages,
        });

        setInitialLoading(false);
        return;
      }

      // For authenticated users, try to restore from API
      if (urlConversationId && isAuthenticated && !session) {
        setInitialLoading(true);
        try {
          // Get conversation details
          const response = await getConversation(urlConversationId);
          const conv = response.data;
          console.log('Restored conversation:', conv);

          if (conv && conv.id) {
            // Set session
            setSession({
              id: conv.id,
              paperId: conv.paperId,
              ragFileId: conv.ragFileId,
              title: conv.title,
              messages: [],
            });

            // Load paper if we have paperId
            if (conv.paperId) {
              try {
                const paperResponse = await getPaper(conv.paperId);
                if (paperResponse.data) {
                  setCurrentPaper(paperResponse.data);
                }
              } catch (err) {
                console.error('Failed to load paper:', err);
              }
            }

            // Message history is now loaded automatically by useInfiniteMessageHistory
          } else {
            // No conversation found, redirect
            console.error('Invalid conversation response:', response);
            navigate('/', { replace: true });
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          // Invalid conversationId, redirect to home
          navigate('/', { replace: true });
        } finally {
          setInitialLoading(false);
        }
      } else if (
        urlConversationId &&
        !isAuthenticated &&
        !guestStore.currentSession
      ) {
        // Guest without session, redirect to home
        navigate('/', { replace: true });
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
      }
    };

    restoreSession();
  }, [urlConversationId, isAuthenticated, isInitialized]);

  // Update URL when session changes (after creating new conversation)
  useEffect(() => {
    // For authenticated sessions
    if (session?.id && !urlConversationId && !isGuest) {
      navigate(`/chat/${session.id}`, { replace: true });
    }
    // For guest sessions
    if (guestSession?.id && !urlConversationId && isGuest) {
      navigate(`/chat/${guestSession.id}`, { replace: true });
    }
  }, [session?.id, guestSession?.id, urlConversationId, navigate, isGuest]);

  // Handle URL query params for page and highlight (for multi-paper citation links)
  useEffect(() => {
    if (initialLoading) return; // Wait until session is restored

    const pageParam = searchParams.get('page');
    const highlightParam = searchParams.get('highlight');

    console.log('[ChatPage] URL params effect:', {
      pageParam,
      highlightParam,
      initialLoading,
    });

    if (pageParam) {
      const pageNumber = parseInt(pageParam, 10);
      if (!isNaN(pageNumber) && pageNumber > 0) {
        // Parse highlight rect if provided
        let rect:
          | { top: number; left: number; width: number; height: number }
          | undefined;
        if (highlightParam) {
          try {
            rect = JSON.parse(highlightParam);
          } catch {
            // Invalid JSON, ignore
          }
        }

        console.log('[ChatPage] Setting pendingJump:', { pageNumber, rect });

        // Set pending jump to navigate to the page
        setPendingJump({
          pageNumber,
          rect,
        });

        // Clear the query params from URL after handling
        navigate(window.location.pathname, { replace: true });
      }
    }
  }, [searchParams, initialLoading, setPendingJump, navigate]);

  // Poll for ingest status when guest paper is processing
  const updateGuestPaper = useGuestStore((s) => s.updateGuestPaper);
  useEffect(() => {
    if (!isGuest || !guestPaper || guestPaper.status !== 'PROCESSING') return;

    const pollStatus = async () => {
      try {
        const { status } = await guestCheckIngestStatus(guestPaper.ragFileId);
        if (status !== 'PROCESSING') {
          updateGuestPaper({ status });
          // Also update paper store
          updateCurrentPaper({ status } as any);
        }
      } catch (err) {
        console.error('Failed to check ingest status:', err);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Check immediately

    return () => clearInterval(interval);
  }, [
    isGuest,
    guestPaper?.ragFileId,
    guestPaper?.status,
    updateGuestPaper,
    updateCurrentPaper,
  ]);

  // =============================================
  // Infinite message history (cursor pagination)
  // =============================================
  const activeConversationId = isGuest
    ? undefined
    : (currentConversationId ?? undefined);
  const activePaperId = isGuest ? undefined : sessionMeta?.paperId;

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMessageHistory(activeConversationId, activePaperId);

  // Flatten paginated server messages into ASC order for display
  const serverMessages = useMemo(
    () => flattenMessagePages(infiniteData),
    [infiniteData],
  );

  // Track messages sent during this session (not yet in server response)
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);

  // Reset sentMessages when conversation changes
  useEffect(() => {
    setSentMessages([]);
  }, [currentConversationId]);

  // Combine server + sent messages, deduplicating by ID
  const messages = useMemo(() => {
    if (isGuest) return guestSession?.messages || [];
    const serverIds = new Set(serverMessages.map((m) => m.id));
    const uniqueSent = sentMessages.filter((m) => !serverIds.has(m.id));
    return [...serverMessages, ...uniqueSent];
  }, [isGuest, guestSession?.messages, serverMessages, sentMessages]);

  // Handle clear chat history - MUST be defined before early returns (Rules of Hooks)
  const handleClearChatHistory = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;

      // Confirm before clearing
      if (!window.confirm('Are you sure you want to clear all chat history?')) {
        return;
      }

      if (isGuest) {
        // For guest users, just clear messages from local store
        setGuestMessages([]);
      } else {
        // For authenticated users, call API
        try {
          await clearChatHistoryMutation.mutateAsync(conversationId);
          // Clear local sent messages
          setSentMessages([]);
        } catch (err) {
          console.error('Failed to clear chat history:', err);
          alert('Failed to clear chat history. Please try again.');
        }
      }
    },
    [isGuest, setGuestMessages, clearChatHistoryMutation],
  );

  // Helper: fetch follow-up questions for an assistant message (fire-and-forget)
  const fetchFollowUps = useCallback(
    (convId: string, messageId: string) => {
      followUpMutation
        .mutateAsync({ conversationId: convId, messageId })
        .then((res) => {
          if (res.success && res.data.questions?.length) {
            setFollowUpMap((prev) => ({
              ...prev,
              [messageId]: res.data.questions,
            }));
          }
        })
        .catch(() => {
          /* already logged by the mutation hook */
        });
    },
    [followUpMutation],
  );

  // onSend handler - defined as useCallback to maintain stable reference
  const onSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeSession) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      // Add user message to appropriate store
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        setSentMessages((prev) => [...prev, userMsg]);
      }

      // Set loading state on appropriate store
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoading(true);

        if (isGuest && guestSession) {
          // Guest: Call guest API
          const { answer, citations, raw } = await guestAskQuestion(
            guestSession.ragFileId,
            text,
            guestPaper?.id || '',
          );
          const assistantMsg = buildGuestAssistantMessage(
            answer,
            citations,
            raw.modelName,
            raw.tokenCount,
          );
          addGuestMessage(assistantMsg);

          // Fetch follow-ups for the new assistant message
          if (guestSession.id && assistantMsg.id) {
            fetchFollowUps(guestSession.id, assistantMsg.id);
          }
        } else if (session) {
          // Authenticated: Call regular API
          const { assistantMsg } = await sendQuery(
            session.id,
            text,
            currentPaper?.id,
          );
          setSentMessages((prev) => [...prev, assistantMsg]);

          // Fetch follow-ups for the new assistant message
          if (session.id && assistantMsg.id) {
            fetchFollowUps(session.id, assistantMsg.id);
          }
        }
      } catch (err: any) {
        console.error('❌ Chat error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong while processing your question.',
          createdAt: new Date().toISOString(),
        };
        if (isGuest) {
          addGuestMessage(errorMsg);
        } else {
          setSentMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      activeSession,
      isGuest,
      guestSession,
      guestPaper?.id,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
    ],
  );

  // handleExplainRegionCapture - handles Explain Region (Sigma capture) using same pipeline as onSend
  const handleExplainRegionCapture = useCallback(
    async (
      imageDataUrl: string,
      pageNumber: number,
      completeProcessing?: () => void,
    ) => {
      if (!activeSession) return;

      // 1. Create user message with captured image (same as onSend)
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: 'Explain this region',
        imageDataUrl,
        createdAt: new Date().toISOString(),
      };

      // 2. Add user message to the same store as normal messages
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        setSentMessages((prev) => [...prev, userMsg]);
      }

      // 3. Set loading state (same as onSend)
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoading(true);

        if (session) {
          // 4. Call explainRegion API
          const { assistantMsg } = await explainRegion(imageDataUrl, {
            conversationId: session.id,
            paperId: currentPaper?.id,
            pageNumber,
          });

          // 5. Add assistant message to same store (same as onSend)
          setSentMessages((prev) => [...prev, assistantMsg]);

          // 6. Fetch follow-ups (same as onSend)
          if (session.id && assistantMsg.id) {
            fetchFollowUps(session.id, assistantMsg.id);
          }
        }
      } catch (err: any) {
        console.error('\u274c Explain Region error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '\u26a0\ufe0f Sorry, something went wrong while analyzing this region.',
          createdAt: new Date().toISOString(),
        };
        if (isGuest) {
          addGuestMessage(errorMsg);
        } else {
          setSentMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setLoading(false);
        completeProcessing?.();
      }
    },
    [
      activeSession,
      isGuest,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
    ],
  );

  // handlePdfAction - defined as useCallback to maintain stable reference
  const handlePdfAction = useCallback(
    async (action: 'explain' | 'summarize', selectedText: string) => {
      if (!activeSession || !selectedText.trim()) return;

      const queryText =
        action === 'explain'
          ? `Explain the following text: "${selectedText}"`
          : `Summarize the following text: "${selectedText}"`;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: queryText,
        createdAt: new Date().toISOString(),
      };

      // Add user message to appropriate store
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        setSentMessages((prev) => [...prev, userMsg]);
      }

      // Set loading state on appropriate store
      const setLoadingPdf = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoadingPdf(true);

        if (isGuest && guestSession) {
          // Guest: Call guest API
          const { answer, citations, raw } = await guestAskQuestion(
            guestSession.ragFileId,
            queryText,
            guestPaper?.id || '',
          );
          const assistantMsg = buildGuestAssistantMessage(
            answer,
            citations,
            raw.modelName,
            raw.tokenCount,
          );
          addGuestMessage(assistantMsg);

          // Fetch follow-ups for the new assistant message
          if (guestSession.id && assistantMsg.id) {
            fetchFollowUps(guestSession.id, assistantMsg.id);
          }
        } else if (session) {
          // Authenticated: Call regular API
          const { assistantMsg } = await sendQuery(
            session.id,
            queryText,
            currentPaper?.id,
          );
          setSentMessages((prev) => [...prev, assistantMsg]);

          // Fetch follow-ups for the new assistant message
          if (session.id && assistantMsg.id) {
            fetchFollowUps(session.id, assistantMsg.id);
          }
        }
      } catch (err: any) {
        console.error('❌ PDF action error:', err);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ Sorry, something went wrong while processing your request.',
          createdAt: new Date().toISOString(),
        };
        if (isGuest) {
          addGuestMessage(errorMsg);
        } else {
          setSentMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setLoadingPdf(false);
      }
    },
    [
      activeSession,
      isGuest,
      guestSession,
      guestPaper?.id,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
    ],
  );

  // ============================================
  // EARLY RETURNS - After all hooks are defined
  // ============================================

  // Show loading state during initial restore
  if (initialLoading) {
    return (
      <div className='min-h-[calc(100vh-4rem)] pl-16 pt-16 flex items-center justify-center text-gray-600'>
        <div className='flex flex-col items-center gap-2'>
          <div className='w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin' />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  // Check for active session (either guest or authenticated)
  if (!activeSession) {
    return (
      <div className='min-h-[calc(100vh-4rem)] pl-16 pt-16 flex items-center justify-center text-gray-600'>
        No session. Go back and upload a PDF file.
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className='pt-8 pl-4 pb-8 pr-4 max-w-screen-2xl mx-auto flex flex-col gap-2'>
      <div className='h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-2'>
        <PdfPanel
          activePaper={activePaper}
          onPdfAction={handlePdfAction}
          isChatDockOpen={isChatDockOpen}
          chatDockWidth={CHAT_DOCK_WIDTH}
          onFullscreenChange={setIsPdfFullscreen}
          onCaptureRefChange={(toggleCapture) => {
            captureToggleRef.current = toggleCapture;
          }}
          onExplainRegionCapture={handleExplainRegionCapture}
        />
        <div
          className='hidden lg:block'
          aria-hidden
        />
      </div>

      <ChatDock
        session={activeSession as any}
        messages={messages}
        onSend={onSend}
        onClearChatHistory={handleClearChatHistory}
        isLoading={isGuest ? guestIsLoading : isChatLoading}
        defaultOpen={true}
        activePaperId={activePaper?.id}
        onOpenChange={setIsChatDockOpen}
        isPdfFullscreen={isPdfFullscreen}
        onExplainMath={() => captureToggleRef.current?.()}
        followUpMap={followUpMap}
        onLoadMore={!isGuest ? fetchNextPage : undefined}
        hasMore={!isGuest ? (hasNextPage ?? false) : false}
        isLoadingMore={!isGuest ? isFetchingNextPage : false}
      />
    </div>
  );
}
