import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BotMessageSquare,
  X,
  FileText,
  Trash2,
} from 'lucide-react';
import ChatSuggestions from './ChatSuggestions';
import ChatMessage from './ChatMessage';
import ChatMessageLoading from './ChatMessageLoading';
import ChatInput from './ChatInput';
import ChatQuickActions from './ChatQuickActions';
import type {
  ChatSession,
  ChatMessage as ChatMessageType,
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
}: Props) {
  // Use messages prop if provided, otherwise fall back to session?.messages
  const messages = messagesProp ?? session?.messages ?? [];

  const [open, setOpen] = useState(defaultOpen);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Track if user manually closed the dock
  const [userClosed, setUserClosed] = useState(false);

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
    const hasNewMessages = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;

    // Only auto-open if user hasn't manually closed AND there are new messages
    if (hasNewMessages && !open && !userClosed) {
      setOpen(true);
    }
  }, [messages.length]);

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

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages.length, isLoading]);

  const WIDTH = position === 'fixed' ? 'w-[450px]' : 'w-full';
  const HEIGHT = position === 'fixed' ? 'h-[81vh]' : 'h-full';
  const currentStepLabel =
    LOADING_STEPS[Math.min(stepIndex, LOADING_STEPS.length - 1)];

  // Determine header title based on mode
  const headerTitle =
    mode === 'multi'
      ? `Chat with ${selectedPapers.length} paper${selectedPapers.length !== 1 ? 's' : ''}`
      : 'Chat Assistant';

  return (
    <>
      {open && (
        <div
          className={`${
            position === 'fixed'
              ? `fixed right-4 bottom-4 z-50 ${WIDTH} ${HEIGHT}`
              : `relative ${WIDTH} ${HEIGHT}`
          } bg-white border border-gray-200 rounded-lg flex flex-col pointer-events-auto overflow-hidden shadow-2xl`}
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
              {/* Only show clear button when there are messages */}
              {messages.length > 0 && onClearChatHistory && (
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
          <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-gray-50/30 relative'>
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
                    onSelect={onSend}
                    disabled={
                      isLoading ||
                      (mode === 'multi' && selectedPapers.length === 0)
                    }
                  />
                )}
              </div>
            )}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                msg={m}
                activePaperId={mode === 'single' ? activePaperId : undefined}
              />
            ))}
            {isLoading && <ChatMessageLoading label={currentStepLabel} />}
            <div ref={bottomRef} />
          </div>

          <div
            id='chat-dock-overlay'
            className='absolute inset-0 z-40 pointer-events-none'
          />

          {/* Footer Area */}
          <div className='bg-white relative z-30 flex flex-col'>
            {/* Quick Actions - only show in single mode with showQuickActions */}
            {showQuickActions && mode === 'single' && (
              <ChatQuickActions
                onSelect={onSend}
                fileId={activePaperId}
                disabled={isLoading}
              />
            )}

            <ChatInput
              onSend={onSend}
              disabled={
                isLoading || (mode === 'multi' && selectedPapers.length === 0)
              }
              placeholder={
                mode === 'multi' && selectedPapers.length === 0
                  ? 'Select papers to start chatting...'
                  : undefined
              }
              showSigmaButton={mode === 'single'}
            />
          </div>
        </div>
      )}

      {!open && (
        <div className={`fixed right-4 bottom-3 z-40 ${WIDTH}`}>
          <button
            className='w-full bg-white border border-gray-300 rounded-lg flex items-center justify-between px-4 py-3 hover:bg-gray-50 shadow-lg transition-all'
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
