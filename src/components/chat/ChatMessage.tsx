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
  ReactionBadges,
  ReplyPreview,
  MessageHoverActions,
} from './message';

interface ChatMessageProps {
  msg: Msg;
  /** Current active paper ID (for single-paper mode to detect cross-paper citations) */
  activePaperId?: string;
  /** Conversation ID – needed for cross-paper citation navigation */
  conversationId?: string;
  /** Callback when user clicks a follow-up question */
  onFollowUpSelect?: (question: string) => void;
  /** Follow-up questions to display (passed from parent, not fetched internally) */
  followUps?: string[];
  /** Whether this message is in a collaborative session (shows sender name) */
  isCollaborative?: boolean;
  /** Whether this message is grouped with the previous one (same sender, close time) */
  isGrouped?: boolean;
  /** Whether to show the timestamp (last in group / standalone) */
  showTimestamp?: boolean;
  /** Callback to toggle a reaction emoji */
  onReact?: (messageId: string, emoji: string) => void;
  /** Callback to start replying to this message */
  onReply?: (msg: Msg) => void;
  /** Callback to delete this message */
  onDelete?: (messageId: string) => void;
  /** Can the current user delete this message? */
  canDelete?: boolean;
  /** Callback to scroll to a specific message (for reply click) */
  onScrollToMessage?: (messageId: string) => void;
}

export default function ChatMessage({
  msg,
  activePaperId,
  onFollowUpSelect,
  followUps = [],
  isCollaborative = false,
  isGrouped = false,
  showTimestamp = false,
  onReact,
  onReply,
  onDelete,
  canDelete = false,
  onScrollToMessage,
}: ChatMessageProps) {
  const isUser = msg.role === 'user';
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);

  // In collaborative mode, determine if this message is from the current user
  // If msg.userId is not set (e.g. optimistic/local messages), assume it's ours
  const isOwnMessage = isUser && (!msg.userId || msg.userId === currentUserId);

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

  // Check if assistant has reaction badges
  const hasReactions = !!(msg.reactions && msg.reactions.length > 0);

  return (
    <div className='group'>
      <MessageBubble
        isUser={isUser}
        isGrouped={isGrouped}
        displayName={msg.displayName}
        avatarUrl={msg.avatarUrl}
        timestamp={msg.createdAt}
        showTimestamp={showTimestamp}
        isCollaborative={isCollaborative}
        isOwnMessage={isOwnMessage}
        hoverActions={
          !isLoading ? (
            <MessageHoverActions
              alignRight={isOwnMessage}
              isAssistant={!isUser}
              canDelete={canDelete}
              canReply={true}
              onReact={(emoji) => onReact?.(msg.id, emoji)}
              onReply={() => onReply?.(msg)}
              onDelete={() => onDelete?.(msg.id)}
            />
          ) : undefined
        }
        reactionBadges={
          hasReactions ? (
            <ReactionBadges
              reactions={msg.reactions!}
              onToggle={(emoji) => onReact?.(msg.id, emoji)}
              alignRight={isOwnMessage}
            />
          ) : undefined
        }
      >
        {isLoading ? (
          <ChatMessageLoading />
        ) : (
          <div className='min-w-0 w-full overflow-hidden'>
            {/* Reply preview (if this message is a reply) */}
            {msg.replyTo && (
              <ReplyPreview
                replyTo={msg.replyTo}
                onClickScroll={onScrollToMessage}
                isOwnMessage={isOwnMessage}
              />
            )}

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
                {isCollaborative && msg.content.match(/^@Assistant\b/i) ? (
                  <>
                    <span className='font-semibold text-yellow-200'>
                      @Assistant
                    </span>
                    {msg.content.replace(/^@Assistant\s*/i, ' ')}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            ) : (
              <MarkdownContent
                content={msg.content}
                citations={msg.citations}
                onJumpToCitation={handleJumpToCitation}
              />
            )}

            {/* Follow-up questions (before sources) */}
            {!isUser && followUps.length > 0 && onFollowUpSelect && (
              <div className='mt-3 pt-3 border-t border-gray-100'>
                <p className='text-[11px] font-semibold text-gray-400 tracking-wider mb-2'>
                  Quickly ask these questions
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {followUps.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onFollowUpSelect(q)}
                      className='text-xs px-3 py-1.5 rounded-full border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 transition-colors cursor-pointer'
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Citation sources (at the bottom) */}
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
    </div>
  );
}
