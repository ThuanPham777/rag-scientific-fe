// src/pages/ChatPage.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePaperStore } from '../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSessionStore } from '../store/useSessionStore';

import {
  chatKeys,
  useClearChatHistory,
  useGenerateFollowUpQuestions,
  useInfiniteMessageHistory,
  flattenMessagePages,
  useSessionDetail,
  useCreateSession,
  useLeaveSession,
  useEndSession,
  useConversation,
  usePaper,
  useToggleReaction,
  useReplyToMessage,
  useDeleteMessage,
} from '../hooks';
import { useSessionSocket } from '../hooks/useSessionSocket';
import {
  sendQuery,
  guestAskQuestion,
  guestCheckIngestStatus,
  buildGuestAssistantMessage,
  explainRegion,
  sendPlainMessage,
} from '../services';
import PdfPanel from '../components/pdf/PdfPanel';
import ChatDock from '../components/chat/ChatDock';
import { InviteModal, ConfirmStartSessionModal } from '../components/session';
import type { ChatMessage } from '../utils/types';

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { conversationId: urlConversationId } = useParams<{
    conversationId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, user: currentUser } = useAuthStore();

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

  // =============================================
  // Declarative Conversation & Paper Loading
  // React Query hooks replace the old imperative restoreSession effect.
  // This ensures: no duplicate API calls, no race conditions,
  // and conversation type is always derived from backend data.
  // =============================================

  // Fetch conversation detail via React Query (authenticated users only)
  const { data: conversationData, isError: isConvError } = useConversation(
    !isGuest && isAuthenticated && isInitialized
      ? urlConversationId
      : undefined,
  );

  // Derive paperId from React Query data or existing store
  const resolvedPaperId = sessionMeta?.paperId || conversationData?.paperId;

  // Fetch paper detail via React Query (may 403 for non-owners — handled below)
  const { data: paperFromQuery, isError: isPaperError } = usePaper(
    !isGuest && isAuthenticated && isInitialized && !!resolvedPaperId
      ? resolvedPaperId
      : undefined,
  );

  // State for ChatDock open status (for fullscreen PDF viewer integration)
  // MUST be defined before any early returns to follow Rules of Hooks
  const [isChatDockOpen, setIsChatDockOpen] = useState(true);
  // State for PDF fullscreen mode
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const CHAT_DOCK_WIDTH = 550;

  // Capture function - will be set by PdfPanel
  const captureToggleRef = useRef<(() => void) | null>(null);
  // Ref to force ChatDock scroll to bottom (for explain region, etc.)
  const chatScrollRef = useRef<(() => void) | null>(null);

  // =============================================
  // Collaborative Session Integration
  // =============================================
  const isCollaborative = useSessionStore((s) => s.isCollaborative);
  const setCollaborative = useSessionStore((s) => s.setCollaborative);
  const isInviteModalOpen = useSessionStore((s) => s.isInviteModalOpen);
  const setInviteModalOpen = useSessionStore((s) => s.setInviteModalOpen);

  // Confirm modal state for starting a session
  const [showConfirmStart, setShowConfirmStart] = useState(false);

  // Stable conversationId for session-related hooks
  const convIdForSession = isGuest
    ? undefined
    : (currentConversationId ?? urlConversationId);

  // Fetch session detail when conversation is loaded (members, invite codes, etc.)
  const { data: sessionDetail } = useSessionDetail(
    convIdForSession,
    !isGuest && !!convIdForSession && isInitialized,
  );

  // --- Sync React Query data → Zustand stores ---

  // 1. Sync conversation → session store
  useEffect(() => {
    if (!conversationData) return;
    // Skip if store already has this conversation fully loaded
    if (currentConversationId === conversationData.id && sessionMeta?.ragFileId)
      return;

    setSession({
      id: conversationData.id,
      paperId: conversationData.paperId,
      ragFileId: conversationData.ragFileId,
      title: conversationData.title,
      messages: [],
    });
  }, [
    conversationData,
    currentConversationId,
    sessionMeta?.ragFileId,
    setSession,
  ]);

  // 2. Derive collaborative state from conversation type (authoritative source)
  //    conversation.type === 'GROUP' is the single source of truth.
  useEffect(() => {
    if (!conversationData) return;
    setCollaborative(
      conversationData.type === 'GROUP' || !!conversationData.isCollaborative,
    );
  }, [conversationData, setCollaborative]);

  // 3. Sync paper → paper store
  useEffect(() => {
    if (isGuest || currentPaper) return; // Already have paper data

    if (paperFromQuery) {
      setCurrentPaper(paperFromQuery);
    } else if (isPaperError && conversationData?.papers?.[0]) {
      // getPaper failed (non-owner) — fallback to paper data from conversation response
      const cp = conversationData.papers[0];
      setCurrentPaper({
        id: cp.id,
        ragFileId: cp.ragFileId,
        fileName: cp.fileName || cp.title || 'Untitled',
        fileUrl: cp.fileUrl || '',
        localUrl: cp.fileUrl || '',
        status: 'COMPLETED' as const,
        createdAt: conversationData.createdAt || new Date().toISOString(),
        updatedAt: conversationData.updatedAt || new Date().toISOString(),
        userId: conversationData.userId || '',
        title: cp.title,
      } as any);
    }
  }, [
    isGuest,
    currentPaper,
    paperFromQuery,
    isPaperError,
    conversationData,
    setCurrentPaper,
  ]);

  // 4. Redirect on conversation load error (not found / access denied)
  useEffect(() => {
    if (isConvError && !isGuest && isAuthenticated && urlConversationId) {
      console.error('Failed to load conversation, redirecting...');
      navigate('/', { replace: true });
    }
  }, [isConvError, isGuest, isAuthenticated, urlConversationId, navigate]);

  // 5. Guest session restoration (sync localStorage → paper store)
  useEffect(() => {
    if (!isInitialized || !urlConversationId) return;

    if (isGuest) {
      const guestStore = useGuestStore.getState();
      if (
        guestStore.currentSession?.id === urlConversationId &&
        guestStore.currentPaper
      ) {
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
      } else if (!guestStore.currentSession) {
        navigate('/', { replace: true });
      }
    } else if (!isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [
    isInitialized,
    urlConversationId,
    isGuest,
    isAuthenticated,
    navigate,
    setCurrentPaper,
    setSession,
  ]);

  // Derived loading state (replaces imperative initialLoading useState)
  // Stays `true` until ALL of: conversation synced, paper synced, collaborative flag set.
  const initialLoading = useMemo(() => {
    if (!urlConversationId) return false;

    // Guest: check if session exists in localStorage
    if (isGuest) {
      const guestStore = useGuestStore.getState();
      return !(guestStore.currentSession?.id === urlConversationId);
    }

    // Auth not ready yet
    if (!isInitialized) return true;
    if (!isAuthenticated) return false; // Will redirect

    // Final check: do we have everything needed to render?
    // currentConversationId is set by effect #1 (conversation → store)
    // sessionMeta?.ragFileId is set at the same time
    // currentPaper is set by effect #3 (paper → store)
    // All three must be present for the page to function correctly.
    if (
      currentConversationId === urlConversationId &&
      sessionMeta?.ragFileId &&
      currentPaper
    ) {
      return false; // Fully ready
    }

    // If conversation query errored, stop loading (effect #4 will redirect)
    if (isConvError) return false;

    // Otherwise we're still loading / syncing
    return true;
  }, [
    urlConversationId,
    isGuest,
    isInitialized,
    isAuthenticated,
    currentConversationId,
    sessionMeta?.ragFileId,
    currentPaper,
    isConvError,
  ]);

  // WebSocket connection for collaborative sessions
  // Only pass conversationId when isCollaborative is confirmed — this ensures
  // the socket effect re-runs when collaborative state is established after reload.
  const { startTyping, stopTyping } = useSessionSocket(
    isCollaborative ? convIdForSession : undefined,
    isCollaborative,
    activePaper?.id,
  );

  // Session mutation hooks
  const createSessionMutation = useCreateSession();
  const leaveSessionMutation = useLeaveSession();
  const endSessionMutation = useEndSession();

  const handleLeaveSession = useCallback(() => {
    if (!convIdForSession) return;
    if (!window.confirm('Leave this collaborative session?')) return;
    leaveSessionMutation.mutate(convIdForSession, {
      onSuccess: () => navigate('/', { replace: true }),
    });
  }, [convIdForSession, leaveSessionMutation, navigate]);

  const handleEndSession = useCallback(() => {
    if (!convIdForSession) return;
    if (!window.confirm('End this session? All members will be disconnected.'))
      return;
    endSessionMutation.mutate(convIdForSession, {
      onSuccess: () => {
        setCollaborative(false);
      },
    });
  }, [convIdForSession, endSessionMutation, setCollaborative]);

  // =============================================
  // Reaction, Reply, Delete hooks
  // =============================================
  const toggleReactionMutation = useToggleReaction();
  const replyToMessageMutation = useReplyToMessage();
  const deleteMessageMutation = useDeleteMessage();

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      const convId = convIdForSession || currentConversationId;
      if (!convId || !currentUser?.id) return;

      // Optimistically update sentMessages so reactions show instantly on
      // just-sent messages that aren't yet in the React Query cache.
      setSentMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = [...(msg.reactions || [])];
          const existingIdx = reactions.findIndex((r) => r.hasReacted);

          if (existingIdx >= 0 && reactions[existingIdx].emoji === emoji) {
            // Toggle off
            if (reactions[existingIdx].count <= 1) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = {
                ...reactions[existingIdx],
                count: reactions[existingIdx].count - 1,
                hasReacted: false,
              };
            }
          } else {
            // Remove old reaction if exists
            if (existingIdx >= 0) {
              if (reactions[existingIdx].count <= 1) {
                reactions.splice(existingIdx, 1);
              } else {
                reactions[existingIdx] = {
                  ...reactions[existingIdx],
                  count: reactions[existingIdx].count - 1,
                  hasReacted: false,
                };
              }
            }
            // Add new reaction
            const newTargetIdx = reactions.findIndex((r) => r.emoji === emoji);
            if (newTargetIdx >= 0) {
              reactions[newTargetIdx] = {
                ...reactions[newTargetIdx],
                count: reactions[newTargetIdx].count + 1,
                hasReacted: true,
              };
            } else {
              reactions.push({ emoji, count: 1, hasReacted: true });
            }
          }
          return { ...msg, reactions };
        }),
      );

      toggleReactionMutation.mutate({
        messageId,
        emoji,
        conversationId: convId,
        currentUserId: currentUser.id,
      });
    },
    [
      convIdForSession,
      currentConversationId,
      currentUser?.id,
      toggleReactionMutation,
    ],
  );

  // handleReplyMessage is defined after sentMessages state (below)

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      const convId = convIdForSession || currentConversationId;
      if (!convId) return;
      // Also remove from local sentMessages (for optimistic messages)
      setSentMessages((prev) => prev.filter((m) => m.id !== messageId));
      deleteMessageMutation.mutate({ conversationId: convId, messageId });
    },
    [convIdForSession, currentConversationId, deleteMessageMutation],
  );

  const canDeleteMessage = useCallback(
    (msg: ChatMessage) => {
      if (!currentUser?.id) return false;
      // User can always delete their own messages
      if (msg.userId === currentUser.id) return true;
      // Session owner can delete assistant messages
      if (isCollaborative && sessionDetail) {
        const myMembership = sessionDetail.members.find(
          (m) => m.userId === currentUser.id,
        );
        if (myMembership?.role === 'OWNER' && msg.role === 'assistant')
          return true;
      }
      // Non-collaborative: conversation owner can delete assistant messages
      if (
        !isCollaborative &&
        conversationData?.userId === currentUser.id &&
        msg.role === 'assistant'
      ) {
        return true;
      }
      return false;
    },
    [currentUser?.id, isCollaborative, sessionDetail, conversationData?.userId],
  );

  const handleConfirmStartSession = useCallback(async () => {
    if (!activePaper?.id) return;
    try {
      const result = await createSessionMutation.mutateAsync({
        paperId: activePaper.id,
        maxMembers: 10,
        sourceConversationId: currentConversationId || undefined,
      });
      setShowConfirmStart(false);

      // Navigate to the NEW collaborative conversation
      const newConvId = result.data.conversationId;
      navigate(`/chat/${newConvId}`, { replace: true });

      setCollaborative(true);
      // Open invite modal so user can share the link right away
      setInviteModalOpen(true);
    } catch {
      // Error handled by mutation hook toast
    }
  }, [
    activePaper?.id,
    createSessionMutation,
    navigate,
    setCollaborative,
    setInviteModalOpen,
  ]);

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

  // Reply handler — no optimistic insert.
  // The mutation's onSuccess invalidates the React Query cache, and the
  // socket "session:new-message" event also invalidates it,
  // so the reply appears once the server confirms it.
  const handleReplyMessage = useCallback(
    (conversationId: string, replyToMessageId: string, content: string) => {
      replyToMessageMutation.mutate({
        conversationId,
        replyToMessageId,
        content,
      });
    },
    [replyToMessageMutation],
  );

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

      const trimmedText = text.trim();

      // In collaborative mode, check for @Assistant prefix
      const isAssistantQuery = isCollaborative
        ? /^@Assistant\b/i.test(trimmedText)
        : true; // Non-collaborative always queries AI

      // Strip @Assistant prefix for the actual RAG query (non-collaborative only)
      // In collaborative mode, send full text to server — server strips prefix for RAG
      const actualText =
        isAssistantQuery && !isCollaborative
          ? trimmedText.replace(/^@Assistant\s*/i, '').trim()
          : trimmedText;

      if (!actualText) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedText, // Show original text including @Assistant
        userId: currentUser?.id,
        displayName: currentUser?.displayName,
        avatarUrl: currentUser?.avatarUrl,
        createdAt: new Date().toISOString(),
      };

      // Add user message to appropriate store
      // Always show optimistic message immediately for instant feedback.
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        setSentMessages((prev) => [...prev, userMsg]);
      }

      // Set loading state on appropriate store
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        // Only show loading for AI queries
        if (isAssistantQuery) {
          setLoading(true);
        }

        if (isGuest && guestSession) {
          // Guest: Call guest API (always AI)
          const { answer, citations, raw } = await guestAskQuestion(
            guestSession.ragFileId,
            actualText,
            guestPaper?.id || '',
          );
          const assistantMsg = buildGuestAssistantMessage(
            answer,
            citations,
            raw.modelName,
            raw.tokenCount,
          );
          addGuestMessage(assistantMsg);

          if (guestSession.id && assistantMsg.id) {
            fetchFollowUps(guestSession.id, assistantMsg.id);
          }
        } else if (session) {
          if (isCollaborative && !isAssistantQuery) {
            // Collaborative mode WITHOUT @Assistant: just send plain message
            const serverMsg = await sendPlainMessage(session.id, trimmedText);
            // Replace temp ID with server ID so dedup works when refetch arrives
            setSentMessages((prev) =>
              prev.map((m) =>
                m.id === userMsg.id ? { ...m, id: serverMsg.id } : m,
              ),
            );
          } else {
            // Authenticated: Call RAG API (either non-collaborative or @Assistant)
            const { assistantMsg, raw } = await sendQuery(
              session.id,
              actualText,
              currentPaper?.id,
            );

            // Replace optimistic user message ID with server ID for proper dedup
            if (raw.userMessageId) {
              setSentMessages((prev) =>
                prev.map((m) =>
                  m.id === userMsg.id ? { ...m, id: raw.userMessageId } : m,
                ),
              );
            }

            // Add assistant message (already has server ID from response)
            setSentMessages((prev) => [...prev, assistantMsg]);

            if (session.id && assistantMsg.id) {
              fetchFollowUps(session.id, assistantMsg.id);
            }
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
        // Invalidate infinite cache so sentMessages get replaced by server
        // versions. This ensures subsequent react/delete operations work on
        // the React Query cache (where optimistic updates apply).
        if (!isGuest && session?.id) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.infiniteMessages(session.id),
          });
        }
      }
    },
    [
      activeSession,
      isCollaborative,
      isGuest,
      guestSession,
      guestPaper?.id,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
      queryClient,
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
        userId: currentUser?.id,
        displayName: currentUser?.displayName,
        avatarUrl: currentUser?.avatarUrl,
        createdAt: new Date().toISOString(),
      };

      // 2. Add user message to the same store as normal messages
      if (isGuest) {
        addGuestMessage(userMsg);
      } else {
        setSentMessages((prev) => [...prev, userMsg]);
      }

      // Scroll to bottom after adding user message
      chatScrollRef.current?.();

      // 3. Set loading state (same as onSend)
      const setLoading = isGuest ? setGuestLoading : setChatLoading;

      try {
        setLoading(true);

        if (session) {
          // 4. Call explainRegion API
          const { assistantMsg, raw } = await explainRegion(imageDataUrl, {
            conversationId: session.id,
            paperId: currentPaper?.id,
            pageNumber,
          });

          // 5. Replace optimistic user message ID with server ID for proper dedup
          if (raw.userMessageId) {
            setSentMessages((prev) =>
              prev.map((m) =>
                m.id === userMsg.id ? { ...m, id: raw.userMessageId } : m,
              ),
            );
          }

          // 6. Add assistant message (already has server ID from response)
          setSentMessages((prev) => [...prev, assistantMsg]);

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
        // Invalidate cache so sentMessages get replaced by server versions
        if (!isGuest && session?.id) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.infiniteMessages(session.id),
          });
        }
      }
    },
    [
      activeSession,
      isCollaborative,
      isGuest,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
      queryClient,
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

      // Scroll to bottom after adding user message
      chatScrollRef.current?.();

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

          if (isCollaborative) {
            // Schedule cleanup to prevent duplicates after WS-triggered refetch
            const uidRm = userMsg.id;
            const aidRm = assistantMsg.id;
            setTimeout(() => {
              setSentMessages((prev) =>
                prev.filter((m) => m.id !== uidRm && m.id !== aidRm),
              );
            }, 3000);
          }

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
        // Invalidate cache so sentMessages get replaced by server versions
        if (!isGuest && session?.id) {
          queryClient.invalidateQueries({
            queryKey: chatKeys.infiniteMessages(session.id),
          });
        }
      }
    },
    [
      activeSession,
      isCollaborative,
      isGuest,
      guestSession,
      guestPaper?.id,
      session,
      currentPaper?.id,
      addGuestMessage,
      setGuestLoading,
      setChatLoading,
      fetchFollowUps,
      queryClient,
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
      <div className='h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_550px] gap-2'>
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
        isCollaborative={isCollaborative}
        sessionDetail={sessionDetail}
        onInvite={() => setInviteModalOpen(true)}
        onLeaveSession={handleLeaveSession}
        onEndSession={handleEndSession}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        onStartSession={
          !isGuest && isAuthenticated && !isCollaborative && convIdForSession
            ? () => setShowConfirmStart(true)
            : undefined
        }
        onReact={handleReact}
        onReplyMessage={handleReplyMessage}
        onDeleteMessage={handleDeleteMessage}
        canDeleteMessage={canDeleteMessage}
        scrollToBottomRef={chatScrollRef}
      />

      {/* Confirm Start Session Modal */}
      <ConfirmStartSessionModal
        isOpen={showConfirmStart}
        isLoading={createSessionMutation.isPending}
        onConfirm={handleConfirmStartSession}
        onCancel={() => setShowConfirmStart(false)}
      />

      {/* Invite Modal */}
      {convIdForSession && (
        <InviteModal
          conversationId={convIdForSession}
          isOpen={isInviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}
