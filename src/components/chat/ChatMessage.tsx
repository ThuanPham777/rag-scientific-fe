// src/components/chat/ChatMessage.tsx
// Chat message component using smaller sub-components

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperStore } from '../../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';
import { findCitation } from '../../utils/citation';
import { createConversation, listConversations } from '../../services';
import type { ChatMessage as Msg, Citation } from '../../utils/types';
import ChatMessageLoading from './ChatMessageLoading';
import {
  MessageBubble,
  MarkdownContent,
  SourcesSection,
  SourcesModal,
} from './message';

interface ChatMessageProps {
  msg: Msg;
  /** Current active paper ID (for single-paper mode to detect cross-paper citations) */
  activePaperId?: string;
}

export default function ChatMessage({ msg, activePaperId }: ChatMessageProps) {
  const isUser = msg.role === 'user';
  const navigate = useNavigate();

  // State for sources section and modal
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Get setPendingJump from appropriate store
  const paperStorePendingJump = usePaperStore((s) => s.setPendingJump);
  const guestStorePendingJump = useGuestStore((s) => s.setPendingJump);
  const guestSession = useGuestStore((s) => s.currentSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const isGuest =
    !isAuthenticated && guestSession?.id && isGuestSession(guestSession.id);
  const setPendingJump = isGuest
    ? guestStorePendingJump
    : paperStorePendingJump;

  /**
   * Check if citation is from a different paper (multi-paper mode)
   */
  const isMultiPaperCitation = useCallback(
    (citation: Citation): boolean => {
      // If citation has sourceFileUrl and a different paperId, it's multi-paper
      if (citation.sourceFileUrl && citation.sourcePaperId) {
        // If we have an active paper, check if citation is from a different paper
        if (activePaperId && citation.sourcePaperId !== activePaperId) {
          return true;
        }
        // If no active paper (library page multi-paper chat), always use multi-paper behavior
        if (!activePaperId) {
          return true;
        }
      }
      return false;
    },
    [activePaperId],
  );

  /**
   * Navigate to ChatPage for the cited paper
   * Opens the single-paper chat page with the correct PDF, page, and highlight
   */
  const navigateToCitedPaper = useCallback(
    async (citation: Citation) => {
      if (!citation.sourcePaperId) return;

      try {
        // Find or create a conversation for the cited paper
        const conversations = await listConversations(citation.sourcePaperId);
        let conversationId: string;

        if (conversations.success && conversations.data.length > 0) {
          // Use existing conversation
          conversationId = conversations.data[0].id;
        } else {
          // Create new conversation for the paper
          const newConv = await createConversation(citation.sourcePaperId);
          conversationId = newConv.data.id;
        }

        // Build URL with page and highlight params
        const params = new URLSearchParams();
        if (citation.page) {
          params.set('page', citation.page.toString());
        }
        if (citation.rect) {
          params.set('highlight', JSON.stringify(citation.rect));
        }

        const url = `/chat/${conversationId}${params.toString() ? `?${params}` : ''}`;

        // Navigate to the chat page (opens in same tab for better UX)
        // Use window.open for new tab to not lose current multi-paper chat context
        window.open(url, '_blank', 'noopener');
      } catch (err) {
        console.error('Failed to navigate to cited paper:', err);
        // Fallback: just navigate to library
        navigate(`/library?openPaper=${citation.sourcePaperId}`);
      }
    },
    [navigate],
  );

  /**
   * Jump to a citation in the PDF viewer
   */
  const handleJumpToCitation = useCallback(
    (citationId: string) => {
      const citation = findCitation(msg.citations, citationId);
      if (!citation) return;

      // Check if multi-paper citation - navigate to that paper's ChatPage
      if (isMultiPaperCitation(citation)) {
        navigateToCitedPaper(citation);
        return;
      }

      // Single paper - jump in current viewer
      if (citation.page) {
        setPendingJump({
          pageNumber: citation.page,
          rect: citation.rect,
        });
      }
    },
    [msg.citations, setPendingJump, isMultiPaperCitation, navigateToCitedPaper],
  );

  /**
   * Jump to page for a specific citation
   */
  const handleJumpToPage = useCallback(
    (citation: Citation) => {
      // Check if multi-paper citation - navigate to that paper's ChatPage
      if (isMultiPaperCitation(citation)) {
        navigateToCitedPaper(citation);
        return;
      }

      // Single paper - jump in current viewer
      if (citation.page) {
        setPendingJump(
          citation.rect
            ? { pageNumber: citation.page, rect: citation.rect }
            : { pageNumber: citation.page },
        );
      }
    },
    [setPendingJump, isMultiPaperCitation, navigateToCitedPaper],
  );

  /**
   * Open modal for viewing citation details
   */
  const handleViewDetails = useCallback((index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  }, []);

  // Loading state for assistant messages
  const isLoading = !isUser && (!msg.content || msg.content.trim() === '');

  return (
    <MessageBubble isUser={isUser}>
      {isLoading ? (
        <ChatMessageLoading />
      ) : (
        <div className='min-w-0 w-full overflow-hidden'>
          {/* Image attachment */}
          {msg.imageDataUrl && (
            <div className='mb-4'>
              <img
                src={msg.imageDataUrl}
                alt='selected region'
                className='rounded-lg border border-gray-200/50 shadow-sm max-h-60 object-contain bg-gray-50 mx-auto sm:mx-0'
              />
            </div>
          )}

          {/* Message content */}
          {isUser ? (
            <div className='text-sm leading-relaxed whitespace-pre-wrap break-words'>
              {msg.content}
            </div>
          ) : (
            <MarkdownContent
              content={msg.content}
              citations={msg.citations}
              onJumpToCitation={handleJumpToCitation}
            />
          )}

          {/* Citation sources */}
          {msg.citations && (
            <>
              <SourcesSection
                citations={msg.citations}
                isOpen={sourcesOpen}
                onToggle={() => setSourcesOpen((v) => !v)}
                onViewDetails={handleViewDetails}
                onJumpToPage={handleJumpToPage}
                isMultiPaper={!activePaperId}
              />
              <SourcesModal
                citations={msg.citations}
                activeIndex={activeIndex}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelectIndex={setActiveIndex}
                onJumpToPage={handleJumpToPage}
                isMultiPaper={!activePaperId}
              />
            </>
          )}
        </div>
      )}
    </MessageBubble>
  );
}
