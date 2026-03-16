// src/components/chat/ChatMessage.tsx
// Chat message component using smaller sub-components

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  NotebookPen,
  ListTree,
  Search,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { usePaperStore } from '../../store/usePaperStore';
import { useGuestStore, isGuestSession } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUiStore } from '../../store/useUiStore';
import { findCitation } from '../../utils/citation';
import { createConversation, listConversations } from '../../services';
import notebookService from '@/services/notebookService';
import type { ChatMessage as Msg, Citation } from '../../utils/types';
import AuthModal from '@/components/auth/AuthModal';
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

/** Lightweight markdown → HTML converter for notebook content */
function mdToHtml(md: string): string {
  // Step 1: Convert LaTeX expressions to KaTeX-compatible span tags.
  // The NotebookEditor's MathInline Tiptap node parses <span class="katex" data-latex="...">.
  // Display math $$...$$ first, then inline $...$
  let protected_ = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const escaped = tex.trim().replace(/"/g, '&quot;');
    return `<span class="katex" data-latex="${escaped}" data-display="true"></span>`;
  });
  protected_ = protected_.replace(/\$([^\n$]+?)\$/g, (_, tex) => {
    const escaped = tex.trim().replace(/"/g, '&quot;');
    return `<span class="katex" data-latex="${escaped}"></span>`;
  });

  // Step 2: Markdown → HTML conversion (on LaTeX-safe text)
  let html = protected_
    // Strip citation references like [S1], [S2], [S10] etc.
    .replace(/\[S\d+\]/g, '')
    // Code blocks (``` ... ```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Wrap remaining plain lines in <p> (skip already wrapped tags)
  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-4]|ul|ol|li|pre|code|div|blockquote)/.test(trimmed))
        return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html;
}

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
  /** Whether this is the last message in its group */
  isLastInGroup?: boolean;
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

  // In collaborative mode, use strict userId check — messages without userId
  // are NOT ours (they may be from other users, created before userId tracking).
  // In personal mode, fall back to "own" when userId is missing (all USER messages are ours).
  const isOwnMessage =
    isUser &&
    (isCollaborative
      ? msg.userId === currentUserId // Strict: must match
      : !msg.userId || msg.userId === currentUserId); // Personal: fallback to own

  // State for sources section and modal
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // State for image lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // --- Notebook action state ---
  const [showNbPicker, setShowNbPicker] = useState(false);
  const [nbList, setNbList] = useState<any[]>([]);
  const [nbSearch, setNbSearch] = useState('');
  const [nbLoading, setNbLoading] = useState(false);
  const [nbSaving, setNbSaving] = useState(false);
  const [showNbAuthModal, setShowNbAuthModal] = useState(false);

  // Paper title for notebook naming
  const currentPaper = usePaperStore((s) => s.currentPaper);

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
        navigate(url);
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
        console.log('Navigating to cited paper for citation', citation);
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
          !isLoading && isCollaborative ? (
            <MessageHoverActions
              alignRight={isOwnMessage}
              isAssistant={!isUser}
              canDelete={canDelete}
              canReply={true}
              reactions={msg.reactions}
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
            {(msg.imageDataUrl || msg.imageUrl) && (
              <div className='mb-4'>
                <img
                  src={msg.imageDataUrl || msg.imageUrl}
                  alt='selected region'
                  className='rounded-lg border border-gray-200/50 shadow-sm max-h-60 object-contain bg-gray-50 mx-auto sm:mx-0 cursor-pointer hover:opacity-90 transition-opacity'
                  onClick={() => setLightboxOpen(true)}
                />
              </div>
            )}

            {/* Image lightbox overlay */}
            {lightboxOpen && (msg.imageDataUrl || msg.imageUrl) && (
              <div
                className='fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm'
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  className='absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-white z-10'
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(false);
                  }}
                >
                  <X size={24} />
                </button>
                <img
                  src={msg.imageDataUrl || msg.imageUrl}
                  alt='selected region — full size'
                  className='max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl'
                  onClick={(e) => e.stopPropagation()}
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
              <>
                <MarkdownContent
                  content={msg.content}
                  citations={msg.citations}
                  onJumpToCitation={handleJumpToCitation}
                />

                {/* ── Notebook action buttons (assistant only) ── */}
                <div className='mt-2 flex items-center gap-2 flex-wrap'>
                  {/* Save to notebook — auto find/create */}
                  <button
                    className='inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors'
                    onClick={async () => {
                      if (!isAuthenticated) {
                        setShowNbAuthModal(true);
                        return;
                      }
                      setNbSaving(true);
                      try {
                        const targetTitle = `Note from AI chat with ${currentPaper?.title || currentPaper?.fileName || 'AI'}`;
                        const allNbs = await notebookService.list();
                        const existing = allNbs.find(
                          (nb: any) => nb.title === targetTitle,
                        );
                        let notebookId: string;
                        const htmlContent = mdToHtml(msg.content);
                        if (existing) {
                          const full = await notebookService.get(existing.id);
                          const appended = (full.content || '') + htmlContent;
                          await notebookService.update(existing.id, {
                            content: appended,
                          });
                          notebookId = existing.id;
                        } else {
                          const created = await notebookService.create({
                            title: targetTitle,
                            content: htmlContent,
                          });
                          notebookId = created.id;
                        }
                        const { openNotebooks, setPendingNotebookId } =
                          useUiStore.getState();
                        setPendingNotebookId(notebookId);
                        openNotebooks();
                      } catch (err) {
                        console.error('Failed to save to notebook', err);
                      } finally {
                        setNbSaving(false);
                      }
                    }}
                    disabled={nbSaving}
                  >
                    <NotebookPen size={14} />
                    {nbSaving ? 'Saving...' : 'Save to notebook'}
                  </button>

                  {/* Select a notebook — picker toggle */}
                  <div className='relative'>
                    <button
                      className='inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors'
                      onClick={async () => {
                        if (!isAuthenticated) {
                          setShowNbAuthModal(true);
                          return;
                        }
                        if (showNbPicker) {
                          setShowNbPicker(false);
                          return;
                        }
                        setShowNbPicker(true);
                        setNbSearch('');
                        setNbLoading(true);
                        try {
                          const list = await notebookService.list();
                          setNbList(list);
                        } catch (err) {
                          console.error('Failed to load notebooks', err);
                        } finally {
                          setNbLoading(false);
                        }
                      }}
                    >
                      <ListTree size={14} />
                      Select a notebook
                      <ChevronDown size={12} />
                    </button>

                    {showNbPicker && (
                      <div className='absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50'>
                        {/* Search */}
                        <div className='flex items-center gap-2 px-3 py-2 border-b border-gray-100'>
                          <Search
                            size={14}
                            className='text-gray-400 flex-shrink-0'
                          />
                          <input
                            autoFocus
                            value={nbSearch}
                            onChange={(e) => setNbSearch(e.target.value)}
                            placeholder='Search'
                            className='flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400'
                          />
                        </div>
                        {/* List */}
                        <div className='max-h-48 overflow-y-auto'>
                          {nbLoading ? (
                            <div className='px-3 py-4 text-center text-sm text-gray-400'>
                              Loading...
                            </div>
                          ) : (
                            (() => {
                              const filtered = nbSearch.trim()
                                ? nbList.filter((nb: any) =>
                                    (nb.title || 'Untitled')
                                      .toLowerCase()
                                      .includes(nbSearch.toLowerCase()),
                                  )
                                : nbList;
                              return filtered.length === 0 ? (
                                <div className='px-3 py-4 text-center text-sm text-gray-400'>
                                  {nbSearch
                                    ? 'No notebooks found'
                                    : 'No notebooks yet'}
                                </div>
                              ) : (
                                filtered.map((nb: any) => (
                                  <button
                                    key={nb.id}
                                    className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm disabled:opacity-50'
                                    disabled={nbSaving}
                                    onClick={async () => {
                                      setNbSaving(true);
                                      try {
                                        const full = await notebookService.get(
                                          nb.id,
                                        );
                                        const appended =
                                          (full.content || '') +
                                          mdToHtml(msg.content);
                                        await notebookService.update(nb.id, {
                                          content: appended,
                                        });
                                        const {
                                          openNotebooks,
                                          setPendingNotebookId,
                                        } = useUiStore.getState();
                                        setPendingNotebookId(nb.id);
                                        openNotebooks();
                                      } catch (err) {
                                        console.error(
                                          'Failed to save to notebook',
                                          err,
                                        );
                                      } finally {
                                        setNbSaving(false);
                                        setShowNbPicker(false);
                                      }
                                    }}
                                  >
                                    {nb.title || 'Untitled'}
                                  </button>
                                ))
                              );
                            })()
                          )}
                        </div>
                        {/* Create new */}
                        <div className='border-t border-gray-100'>
                          <button
                            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm font-medium'
                            disabled={nbSaving}
                            onClick={async () => {
                              setNbSaving(true);
                              try {
                                const created = await notebookService.create({
                                  title: 'Untitled',
                                  content: mdToHtml(msg.content),
                                });
                                const { openNotebooks, setPendingNotebookId } =
                                  useUiStore.getState();
                                setPendingNotebookId(created.id);
                                openNotebooks();
                              } catch (err) {
                                console.error('Failed to create notebook', err);
                              } finally {
                                setNbSaving(false);
                                setShowNbPicker(false);
                              }
                            }}
                          >
                            <Plus size={14} /> Create New Notebook
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auth modal for notebook actions */}
                <AuthModal
                  isOpen={showNbAuthModal}
                  onClose={() => setShowNbAuthModal(false)}
                  initialMode='login'
                  onLoginSuccess={() => setShowNbAuthModal(false)}
                />
              </>
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
