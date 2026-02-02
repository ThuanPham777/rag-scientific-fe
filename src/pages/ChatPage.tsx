// src/pages/ChatPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/usePaperStore';
import {
  sendQuery,
  getMessageHistory,
  getConversation,
  getPaper,
} from '../services/api';
import PdfPanel from '../components/pdf/PdfPanel';
import ChatDock from '../components/chat/ChatDock';
import type { ChatMessage } from '../utils/types';

export default function ChatPage() {
  const { conversationId: urlConversationId } = useParams<{
    conversationId?: string;
  }>();
  const navigate = useNavigate();
  const {
    session,
    paper,
    isChatLoading,
    addMessage,
    setMessages,
    setSession,
    setPaper,
    setChatLoading,
  } = usePaperStore();
  // Start as true if we have urlConversationId but no session (need to restore)
  const [initialLoading, setInitialLoading] = useState(
    !!urlConversationId && !usePaperStore.getState().session,
  );

  // Restore session from URL on mount/reload
  useEffect(() => {
    const restoreSession = async () => {
      // If we have a conversationId in URL but no session in store, restore it
      if (urlConversationId && !session) {
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
                  // Add paperUrl from conversation if available
                  const paperData = {
                    ...paperResponse.data,
                    fileUrl: conv.paperUrl || paperResponse.data.fileUrl,
                  };
                  setPaper(paperData);
                }
              } catch (err) {
                console.error('Failed to load paper:', err);
              }
            }

            // Load message history
            try {
              const messages = await getMessageHistory(urlConversationId);
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
      } else {
        setInitialLoading(false);
      }
    };

    restoreSession();
  }, [urlConversationId]);

  // Update URL when session changes (after creating new conversation)
  useEffect(() => {
    if (session?.id && !urlConversationId) {
      // Update URL without adding to history
      navigate(`/chat/${session.id}`, { replace: true });
    }
  }, [session?.id, urlConversationId, navigate]);

  // Load message history when session changes (for existing sessions)
  useEffect(() => {
    if (session?.id && urlConversationId && session.id === urlConversationId) {
      getMessageHistory(session.id)
        .then((messages) => {
          if (messages.length > 0) {
            setMessages(messages);
          }
        })
        .catch((err) => {
          console.error('Failed to load message history:', err);
        });
    }
  }, [session?.id, urlConversationId, setMessages]);

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

  if (!session)
    return (
      <div className='min-h-[calc(100vh-4rem)] pl-16 pt-16 flex items-center justify-center text-gray-600'>
        No session. Go back and upload a PDF file.
      </div>
    );

  const onSend = async (text: string) => {
    if (!text.trim() || !session) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    addMessage(userMsg);

    try {
      setChatLoading(true);

      // Send query using conversationId
      const { assistantMsg } = await sendQuery(session.id, text, paper?.id);

      addMessage(assistantMsg);
    } catch (err: any) {
      console.error('❌ Chat error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          '⚠️ Sorry, something went wrong while processing your question.',
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePdfAction = async (
    action: 'explain' | 'summarize',
    selectedText: string,
  ) => {
    if (!session || !selectedText.trim()) return;

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

    addMessage(userMsg);

    try {
      setChatLoading(true);

      const { assistantMsg } = await sendQuery(
        session.id,
        queryText,
        paper?.id,
      );

      console.log('call api success', assistantMsg);
      addMessage(assistantMsg);
    } catch (err: any) {
      console.error('❌ PDF action error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          '⚠️ Sorry, something went wrong while processing your request.',
        createdAt: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className='pt-8 pl-4 pb-8 pr-4 max-w-screen-2xl mx-auto flex flex-col gap-2'>
      <div className='h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 px-3'>
        <PdfPanel
          activePaper={paper}
          onPdfAction={handlePdfAction}
        />
        <div
          className='hidden lg:block'
          aria-hidden
        />
      </div>

      <ChatDock
        session={session}
        onSend={onSend}
        isLoading={isChatLoading}
        defaultOpen={true}
        activePaperId={paper?.id}
      />
    </div>
  );
}
