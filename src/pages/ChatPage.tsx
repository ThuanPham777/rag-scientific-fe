// src/pages/ChatPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { usePaperStore } from '../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  sendQuery,
  getMessageHistory,
  getConversation,
  getPaper,
  guestAskQuestion,
  guestCheckIngestStatus,
  buildGuestAssistantMessage,
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
  const { isAuthenticated } = useAuthStore();
  const {
    session,
    paper,
    isChatLoading,
    addMessage,
    setMessages,
    setSession,
    setPaper,
    setChatLoading,
    setPendingJump,
  } = usePaperStore();

  // Guest store
  const {
    currentSession: guestSession,
    currentPaper: guestPaper,
    addGuestMessage,
    isLoading: guestIsLoading,
    setLoading: setGuestLoading,
  } = useGuestStore();

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
    : paper;

  // Start as true if we have urlConversationId but no session (need to restore)
  const [initialLoading, setInitialLoading] = useState(() => {
    if (!urlConversationId) return false;
    // Check if guest session exists in localStorage
    const guestStore = useGuestStore.getState();
    if (guestStore.currentSession?.id === urlConversationId) {
      return false; // Guest session found
    }
    // Authenticated session - check paper store
    if (usePaperStore.getState().session?.id === urlConversationId) {
      return false;
    }
    return true; // Need to restore
  });

  // Restore session from URL on mount/reload
  useEffect(() => {
    const restoreSession = async () => {
      // Check if guest session exists in localStorage
      const guestStore = useGuestStore.getState();
      if (
        urlConversationId &&
        guestStore.currentSession?.id === urlConversationId &&
        guestStore.currentPaper
      ) {
        // Session found in localStorage, sync to paper store for PDF viewer
        setPaper({
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
                  setPaper(paperResponse.data);
                }
              } catch (err) {
                console.error('Failed to load paper:', err);
              }
            }

            // Load message history
            try {
              const messages = await getMessageHistory(
                urlConversationId,
                conv.paperId,
              );
              if (messages.length > 0) {
                setMessages(messages);
              }
            } catch (err) {
              console.error('Failed to load message history:', err);
            }
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
  }, [urlConversationId, isAuthenticated]);

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
          usePaperStore.getState().updatePaper({ status } as any);
        }
      } catch (err) {
        console.error('Failed to check ingest status:', err);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Check immediately

    return () => clearInterval(interval);
  }, [isGuest, guestPaper?.ragFileId, guestPaper?.status, updateGuestPaper]);

  // Load message history when session changes (for existing authenticated sessions only)
  useEffect(() => {
    // Skip for guest sessions - messages are persisted in localStorage
    if (isGuest) return;

    if (session?.id && urlConversationId && session.id === urlConversationId) {
      getMessageHistory(session.id, session.paperId)
        .then((messages) => {
          if (messages.length > 0) {
            setMessages(messages);
          }
        })
        .catch((err) => {
          console.error('Failed to load message history:', err);
        });
    }
  }, [session?.id, urlConversationId, setMessages, isGuest]);

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

  // Get messages from appropriate store
  const messages = isGuest
    ? guestSession?.messages || []
    : session?.messages || [];

  const onSend = async (text: string) => {
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
      addMessage(userMsg);
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
      } else if (session) {
        // Authenticated: Call regular API
        const { assistantMsg } = await sendQuery(session.id, text, paper?.id);
        addMessage(assistantMsg);
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
        addMessage(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePdfAction = async (
    action: 'explain' | 'summarize',
    selectedText: string,
  ) => {
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
      addMessage(userMsg);
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
      } else if (session) {
        // Authenticated: Call regular API
        const { assistantMsg } = await sendQuery(
          session.id,
          queryText,
          paper?.id,
        );
        console.log('call api success', assistantMsg);
        addMessage(assistantMsg);
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
        addMessage(errorMsg);
      }
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className='pt-8 pl-4 pb-8 pr-4 max-w-screen-2xl mx-auto flex flex-col gap-2'>
      <div className='h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 px-3'>
        <PdfPanel
          activePaper={activePaper}
          onPdfAction={handlePdfAction}
        />
        <div
          className='hidden lg:block'
          aria-hidden
        />
      </div>

      <ChatDock
        session={activeSession}
        messages={messages}
        onSend={onSend}
        isLoading={isGuest ? guestIsLoading : isChatLoading}
        defaultOpen={true}
        activePaperId={activePaper?.ragFileId}
      />
    </div>
  );
}
