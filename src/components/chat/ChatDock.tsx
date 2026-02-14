import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BotMessageSquare,
  X,
  FileText,
  Trash2,
  Loader2,
} from 'lucide-react';
import ChatSuggestions from './ChatSuggestions';
import ChatMessage from './ChatMessage';
import ChatMessageLoading from './ChatMessageLoading';
import ChatInput from './ChatInput';
import type { MentionMember } from './ChatInput';
import ChatQuickActions from './ChatQuickActions';
import { SessionBar, StartSessionButton } from '../session';
import { TypingIndicator } from '../session';
import { DateSeparator, NewMessageButton } from './message';
import {
  shouldGroupMessages,
  isDifferentDay,
  formatDaySeparator,
} from '../../utils/formatTimestamp';
import type {
  ChatSession,
  ChatMessage as ChatMessageType,
  SessionDetail,
} from '../../utils/types';

export type ChatMode = 'single' | 'multi';

interface SelectedPaperInfo {
  id: string;
  fileName: string;
}

type Props = {
  // Core props
  session?: ChatSession;
  messages?: ChatMessageType[];
  onSend: (text: string, opts?: { highQuality: boolean }) => void;
  onClearChatHistory?: (conversationId: string) => void;
  isLoading?: boolean;

  // Display configuration
  defaultOpen?: boolean;
  position?: 'fixed' | 'static';

  // Mode configuration
  mode?: ChatMode;
  activePaperId?: string;
  conversationId?: string; // For multi-paper mode where session doesn't have conversation ID

  // Multi-paper mode props
  selectedPapers?: SelectedPaperInfo[];
  onRemovePaper?: (paperId: string) => void;

  // Feature toggles
  showQuickActions?: boolean;
  showSuggestions?: boolean;

  // Callback for open state changes (for fullscreen PDF viewer integration)
  onOpenChange?: (isOpen: boolean) => void;

  // Whether PDF viewer is in fullscreen mode (for z-index adjustment)
  isPdfFullscreen?: boolean;

  // Capture functionality
  onExplainMath?: () => void;

  // Follow-up questions keyed by message ID (populated by parent after assistant response)
  followUpMap?: Record<string, string[]>;

  // Infinite scroll (load older messages when scrolling up)
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;

  // Collaborative session props
  isCollaborative?: boolean;
  sessionDetail?: SessionDetail;
  onInvite?: () => void;
  onLeaveSession?: () => void;
  onEndSession?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onStartSession?: () => void;
};

const LOADING_STEPS = [
  'Understanding your question',
  'Searching relevant contexts',
  'Reading selected sections',
  'Composing answer with citations',
];

export default function ChatDock({
  session,
  messages: messagesProp,
  onSend,
  onClearChatHistory,
  isLoading = false,
  defaultOpen = true,
  position = 'fixed',
  mode = 'single',
  activePaperId,
  conversationId,
  selectedPapers = [],
  onRemovePaper,
  showQuickActions = true,
  showSuggestions = true,
  onOpenChange,
  isPdfFullscreen = false,
  onExplainMath,
  followUpMap = {},
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isCollaborative = false,
  sessionDetail,
  onInvite,
  onLeaveSession,
  onEndSession,
  onTypingStart,
  onTypingStop,
  onStartSession,
}: Props) {
  // Use messages prop if provided, otherwise fall back to session?.messages
  const messages = messagesProp ?? session?.messages ?? [];

  const [open, setOpen] = useState(defaultOpen);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [inputText, setInputText] = useState('');

  // ── Smart scroll: track whether user is near the bottom ──
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const NEAR_BOTTOM_THRESHOLD = 120; // px

  // Build mention members list for @ autocomplete
  const mentionMembers = useMemo<MentionMember[]>(() => {
    if (!isCollaborative) return [];
    const members: MentionMember[] = [
      { id: 'assistant', displayName: 'Assistant', isAssistant: true },
    ];
    if (sessionDetail?.members) {
      for (const m of sessionDetail.members) {
        members.push({
          id: m.userId,
          displayName: m.displayName || 'User',
          avatarUrl: m.avatarUrl,
        });
      }
    }
    return members;
  }, [isCollaborative, sessionDetail?.members]);

  // Helper: auto-prefix @Assistant for AI-directed actions in collaborative mode
  // (suggestions, quick actions, follow-up questions)
  const sendAsAssistant = useCallback(
    (text: string) => {
      if (isCollaborative) {
        onSend(`@Assistant ${text}`);
      } else {
        onSend(text);
      }
    },
    [isCollaborative, onSend],
  );

  // Track suggestions panel state to close it when sending message
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Track if user manually closed the dock
  const [userClosed, setUserClosed] = useState(false);

  // Track if initial scroll has been performed (for opening from citation links)
  const hasInitialScrolled = useRef(false);

  // Infinite scroll: preserve scroll position when prepending older messages
  const prevScrollHeightRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);

  // Handle scroll: load older messages at top + track near-bottom state
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;

      // Track near-bottom for "new message" button
      const distFromBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;
      const nearBottom = distFromBottom < NEAR_BOTTOM_THRESHOLD;
      setIsNearBottom(nearBottom);
      if (nearBottom) setNewMsgCount(0);

      // Load older messages when scrolled near top
      if (!onLoadMore || !hasMore || isLoadingMore || isLoadingMoreRef.current)
        return;
      if (target.scrollTop < 80) {
        isLoadingMoreRef.current = true;
        prevScrollHeightRef.current = target.scrollHeight;
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoadingMore],
  );

  // After older messages are prepended, restore scroll position
  useEffect(() => {
    if (!isLoadingMoreRef.current) return;
    if (isLoadingMore) return; // still loading

    // Loading finished — restore scroll position
    const container = messagesContainerRef.current;
    if (container && prevScrollHeightRef.current > 0) {
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop += newScrollHeight - prevScrollHeightRef.current;
        prevScrollHeightRef.current = 0;
        isLoadingMoreRef.current = false;
      });
    } else {
      isLoadingMoreRef.current = false;
    }
  }, [isLoadingMore, messages.length]);

  // Notify parent when open state changes
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading) {
      setStepIndex(0);
      intervalId = window.setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= LOADING_STEPS.length - 1) return prev;
          return prev + 1;
        });
      }, 2000);
    } else {
      setStepIndex(0);
    }
    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isLoading]);

  // Auto-open only when NEW messages arrive (not on every render)
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    const newCount = messages.length - prevMsgCount.current;
    const hasNewMessages = newCount > 0;
    prevMsgCount.current = messages.length;

    if (!hasNewMessages) return;

    // Auto-open if user hasn't manually closed AND there are new messages
    if (!open && !userClosed) {
      setOpen(true);
    }

    // Track unread count when scrolled up
    if (!isNearBottom && open) {
      setNewMsgCount((c) => c + newCount);
    }
  }, [messages.length]);

  // Reset new message count when conversation changes
  useEffect(() => {
    setNewMsgCount(0);
    setIsNearBottom(true);
  }, [conversationId, session?.id]);

  // Reset initial scroll tracking when conversation changes
  useEffect(() => {
    hasInitialScrolled.current = false;
  }, [conversationId, session?.id]);

  // Reset userClosed when user opens the dock
  const handleToggle = () => {
    setOpen((v) => {
      if (v) {
        // User is closing
        setUserClosed(true);
      } else {
        // User is opening
        setUserClosed(false);
      }
      return !v;
    });
  };

  // Auto-scroll to bottom only when user is near the bottom (or loading finishes)
  useEffect(() => {
    if (!open) return;
    // Skip auto-scroll when prepending older messages (scroll-up load)
    if (isLoadingMoreRef.current) return;
    // Only auto-scroll if user is near the bottom already
    if (!isNearBottom && messages.length > 1) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [open, messages.length, isLoading]);

  // Robust initial scroll: when messages first arrive (e.g. from citation nav),
  // ensure we scroll to bottom even if the timing-based effect above missed it
  useEffect(() => {
    if (!open || hasInitialScrolled.current || messages.length === 0) return;
    hasInitialScrolled.current = true;
    // Double rAF to ensure layout is fully computed after first message render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    });
  }, [open, messages.length]);

  // Scroll-to-bottom helper for the "New messages" button
  const scrollToBottom = useCallback(() => {
    setNewMsgCount(0);
    setIsNearBottom(true);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const WIDTH = position === 'fixed' ? `w-[500px]` : 'w-full';
  const HEIGHT =
    position === 'fixed' ? (isPdfFullscreen ? 'h-full' : 'h-[81vh]') : 'h-full';
  const currentStepLabel =
    LOADING_STEPS[Math.min(stepIndex, LOADING_STEPS.length - 1)];

  // Z-index: higher when PDF is fullscreen to appear above the overlay
  const zIndex = isPdfFullscreen ? 'z-[80]' : 'z-50';
  // Position adjustments for fullscreen mode
  const positionClasses = isPdfFullscreen
    ? `fixed right-0 top-0 bottom-0 ${zIndex} ${WIDTH}`
    : `fixed right-4 bottom-4 ${zIndex} ${WIDTH} ${HEIGHT}`;

  // Determine header title based on mode
  console.log('ChatDock render:', { mode, selectedPapers, isCollaborative });
  const headerTitle =
    mode === 'multi'
      ? `Chat with ${selectedPapers.length} paper${selectedPapers.length !== 1 ? 's' : ''}`
      : isCollaborative
        ? 'Collaborative Chat'
        : 'Chat Assistant';

  return (
    <>
      {open && (
        <div
          className={`${
            position === 'fixed'
              ? positionClasses
              : `relative ${WIDTH} ${HEIGHT}`
          } bg-white border border-gray-200 ${isPdfFullscreen ? 'rounded-none border-l' : 'rounded-lg'} flex flex-col pointer-events-auto shadow-2xl`}
        >
          {/* Header */}
          <div
            className='px-4 py-2 border-b border-b-gray-200 flex items-center justify-between cursor-pointer select-none bg-white z-20'
            onClick={handleToggle}
          >
            <div className='flex items-center gap-2 font-semibold text-gray-800'>
              <BotMessageSquare className='text-orange-500' />
              <span>{headerTitle}</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-500'>
              {/* Clear history: only show for non-collaborative sessions */}
              {!isCollaborative &&
                messages.length > 0 &&
                onClearChatHistory && (
                  <button
                    className='p-1.5 rounded hover:bg-gray-100 transition-colors'
                    title='Clear chat history'
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use conversationId prop (for multi-paper) or session.id (for single)
                      const convId = conversationId || session?.id;
                      if (convId) {
                        onClearChatHistory(convId);
                      }
                    }}
                  >
                    <Trash2
                      size={16}
                      className='text-gray-500 hover:text-red-500'
                    />
                  </button>
                )}
              {/* start session button — only show when not already collaborative */}
              {!isCollaborative && onStartSession && (
                <StartSessionButton onClick={onStartSession} />
              )}
              <button
                className='p-1.5 rounded hover:bg-gray-100'
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Collaborative Session Bar */}
          {isCollaborative && sessionDetail && (
            <SessionBar
              sessionDetail={sessionDetail}
              onInvite={onInvite || (() => {})}
              onLeave={onLeaveSession || (() => {})}
              onEnd={onEndSession || (() => {})}
            />
          )}

          {/* Selected Papers Badge (Multi-paper mode) */}
          {mode === 'multi' && selectedPapers.length > 0 && (
            <div className='px-3 py-2 bg-orange-50 border-b border-orange-100'>
              <div className='flex flex-wrap gap-1.5'>
                {selectedPapers.map((paper) => (
                  <span
                    key={paper.id}
                    className='inline-flex items-center gap-1 px-2 py-1 bg-white border border-orange-200 rounded-full text-xs text-gray-700'
                  >
                    <FileText
                      size={12}
                      className='text-orange-500'
                    />
                    <span className='max-w-[120px] truncate'>
                      {paper.fileName}
                    </span>
                    {onRemovePaper && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePaper(paper.id);
                        }}
                        className='ml-0.5 p-0.5 hover:bg-orange-100 rounded-full'
                      >
                        <X
                          size={12}
                          className='text-gray-400 hover:text-gray-600'
                        />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className='flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-white relative'
          >
            {/* Loading older messages indicator */}
            {isLoadingMore && (
              <div className='flex items-center justify-center py-2'>
                <Loader2 className='h-4 w-4 animate-spin text-gray-400 mr-2' />
                <span className='text-xs text-gray-400'>
                  Loading older messages…
                </span>
              </div>
            )}
            {messages.length === 0 && showSuggestions && (
              <div className='mb-6'>
                {mode === 'multi' && selectedPapers.length === 0 ? (
                  <div className='text-center py-8 text-gray-500'>
                    <FileText
                      size={48}
                      className='mx-auto mb-3 text-gray-300'
                    />
                    <p className='text-sm'>
                      Select papers from the library to start chatting
                    </p>
                  </div>
                ) : (
                  <ChatSuggestions
                    onSelect={sendAsAssistant}
                    disabled={
                      isLoading ||
                      (mode === 'multi' && selectedPapers.length === 0)
                    }
                  />
                )}
              </div>
            )}
            {messages.map((m, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const next = idx < messages.length - 1 ? messages[idx + 1] : null;

              // Day separator: show when this message is on a different day from the previous
              const showDaySeparator = prev
                ? isDifferentDay(prev.createdAt, m.createdAt)
                : idx === 0 && !!m.createdAt;

              // Message grouping: consecutive messages from same sender within 2 minutes
              const isGrouped = prev ? shouldGroupMessages(prev, m) : false;
              // Show timestamp on the last message of a group (next is different sender/gap or end)
              const isLastInGroup = next ? !shouldGroupMessages(m, next) : true;

              return (
                <div key={m.id}>
                  {showDaySeparator && m.createdAt && (
                    <DateSeparator label={formatDaySeparator(m.createdAt)} />
                  )}
                  <ChatMessage
                    msg={m}
                    activePaperId={
                      mode === 'single' ? activePaperId : undefined
                    }
                    conversationId={conversationId || session?.id}
                    onFollowUpSelect={sendAsAssistant}
                    followUps={followUpMap[m.id] || []}
                    isCollaborative={isCollaborative}
                    isGrouped={isGrouped}
                    showTimestamp={isLastInGroup}
                  />
                </div>
              );
            })}
            {isLoading && <ChatMessageLoading label={currentStepLabel} />}
            <div ref={bottomRef} />

            {/* New messages floating button */}
            <NewMessageButton
              count={newMsgCount}
              onClick={scrollToBottom}
            />
          </div>

          <div
            id='chat-dock-overlay'
            className='absolute inset-0 z-[110] pointer-events-none'
          />

          {/* Footer Area */}
          <div className='bg-white relative z-100 flex flex-col'>
            {/* Typing indicator for collaborative sessions */}
            {isCollaborative && <TypingIndicator />}

            {/* Quick Actions - only show in single mode with showQuickActions */}
            {showQuickActions && mode === 'single' && (
              <ChatQuickActions
                onSelect={(text) => {
                  // When question is selected from suggestions, also close the panel
                  setIsSuggestionsOpen(false);
                  sendAsAssistant(text);
                }}
                conversationId={conversationId || session?.id}
                disabled={isLoading}
                inputText={inputText}
                open={isSuggestionsOpen}
                onOpenChange={setIsSuggestionsOpen}
              />
            )}

            <ChatInput
              onSend={(text, opts) => {
                // Close suggestions panel when sending message
                setIsSuggestionsOpen(false);
                onSend(text, opts);
                setInputText('');
                onTypingStop?.();
              }}
              onTextChange={(val) => {
                setInputText(val);
                if (val.trim()) onTypingStart?.();
                else onTypingStop?.();
              }}
              onExplainMath={onExplainMath}
              disabled={
                isLoading || (mode === 'multi' && selectedPapers.length === 0)
              }
              placeholder={
                mode === 'multi' && selectedPapers.length === 0
                  ? 'Select papers to start chatting...'
                  : isCollaborative
                    ? 'Type a message... (use @Assistant to ask AI)'
                    : undefined
              }
              showSigmaButton={mode === 'single'}
              mentionMembers={mentionMembers}
            />
          </div>
        </div>
      )}

      {!open && (
        <div
          className={`fixed ${isPdfFullscreen ? 'right-0 bottom-0' : 'right-4 bottom-3'} ${isPdfFullscreen ? 'z-[80]' : 'z-40'} ${WIDTH}`}
        >
          <button
            className={`w-full bg-white border border-gray-300 ${isPdfFullscreen ? 'rounded-none border-l border-b-0' : 'rounded-lg'} flex items-center justify-between px-4 py-3 hover:bg-gray-50 shadow-lg transition-all`}
            onClick={handleToggle}
          >
            <span className='flex items-center gap-2'>
              <BotMessageSquare className='text-orange-500' />
              <span className='font-medium text-gray-700'>
                Open Chat Assistant
              </span>
            </span>
            <ChevronUp
              size={18}
              className='text-gray-400'
            />
          </button>
        </div>
      )}
    </>
  );
}
