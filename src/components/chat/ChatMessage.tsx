// src/components/chat/ChatMessage.tsx
// Chat message component using smaller sub-components

import { useState, useCallback } from 'react';
import { usePaperStore } from '../../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';
import { findCitation } from '../../utils/citation';
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
}

export default function ChatMessage({ msg }: ChatMessageProps) {
  const isUser = msg.role === 'user';

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
   * Jump to a citation in the PDF viewer
   */
  const handleJumpToCitation = useCallback(
    (citationId: string) => {
      const citation = findCitation(msg.citations, citationId);
      if (citation?.page) {
        setPendingJump({
          pageNumber: citation.page,
          rect: citation.rect,
        });
      }
    },
    [msg.citations, setPendingJump],
  );

  /**
   * Jump to page for a specific citation
   */
  const handleJumpToPage = useCallback(
    (citation: Citation) => {
      if (citation.page) {
        setPendingJump(
          citation.rect
            ? { pageNumber: citation.page, rect: citation.rect }
            : { pageNumber: citation.page },
        );
      }
    },
    [setPendingJump],
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
              />
              <SourcesModal
                citations={msg.citations}
                activeIndex={activeIndex}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSelectIndex={setActiveIndex}
                onJumpToPage={handleJumpToPage}
              />
            </>
          )}
        </div>
      )}
    </MessageBubble>
  );
}
