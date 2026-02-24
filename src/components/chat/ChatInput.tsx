import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Sigma } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Switch } from '@radix-ui/react-switch';
import { UserAvatar, AssistantAvatar } from '../common/UserAvatar';
import { useAuthStore } from '@/store/useAuthStore';
import { useGuestStore } from '@/store/useGuestStore';
import { useGuestLimitStore } from '@/store/useGuestLimitStore';
import AuthModal from '@/components/auth/AuthModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export type MentionMember = {
  id: string; // 'assistant' for AI, or userId
  displayName: string;
  avatarUrl?: string | null;
  isAssistant?: boolean;
};

type Props = {
  onSend: (text: string, opts?: { highQuality: boolean }) => void;
  onExplainMath?: () => void;
  onTextChange?: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showSigmaButton?: boolean;
  /** Members available for @ mention (collaborative mode) */
  mentionMembers?: MentionMember[];
};

export default function ChatInput({
  onSend,
  onExplainMath,
  onTextChange,
  disabled = false,
  placeholder,
  showSigmaButton = true,
  mentionMembers = [],
}: Props) {
  const [text, setText] = useState('');
  const [hq, setHq] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Mention autocomplete state
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Filtered members based on mention query
  const filteredMembers = useMemo(() => {
    if (!mentionOpen || mentionMembers.length === 0) return [];
    const q = mentionQuery.toLowerCase();
    return mentionMembers.filter((m) =>
      m.displayName.toLowerCase().includes(q),
    );
  }, [mentionOpen, mentionQuery, mentionMembers]);

  // Reset index when filter changes
  useEffect(() => {
    setMentionIndex(0);
  }, [filteredMembers.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 64; // min-h-16
      const maxHeight = 192; // max-h-48 (6 rows * 32px)
      textarea.style.height = `${Math.min(
        Math.max(scrollHeight, minHeight),
        maxHeight,
      )}px`;
    }
  }, [text]);

  // Insert mention into text
  const insertMention = useCallback(
    (member: MentionMember) => {
      const before = text.slice(0, mentionStartPos);
      const after = text.slice(
        mentionStartPos + 1 + mentionQuery.length, // +1 for the '@'
      );
      const mentionText = `@${member.displayName} `;
      const newText = before + mentionText + after;
      setText(newText);
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStartPos(-1);
      onTextChange?.(newText);

      // Focus textarea and set cursor after mention
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPos = before.length + mentionText.length;
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [text, mentionStartPos, mentionQuery, onTextChange],
  );

  // Handle text change with mention detection
  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      onTextChange?.(value);

      if (mentionMembers.length === 0) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);

      // Find the last '@' before cursor that starts a mention
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex >= 0) {
        // Check if '@' is at start or preceded by whitespace
        const charBefore = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          const query = textBeforeCursor.slice(lastAtIndex + 1);
          // Only open if query doesn't contain spaces (single-word mention)
          if (!query.includes(' ')) {
            setMentionOpen(true);
            setMentionQuery(query);
            setMentionStartPos(lastAtIndex);
            return;
          }
        }
      }

      setMentionOpen(false);
      setMentionQuery('');
      setMentionStartPos(-1);
    },
    [mentionMembers.length, onTextChange],
  );

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t, { highQuality: hq });
    setText('');
    setMentionOpen(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention navigation
    if (mentionOpen && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleOnSendClick = () => {
    send();
  };

  return (
    <div className='px-3 pb-3 bg-white relative'>
      <AuthModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        initialMode='login'
        onLoginSuccess={() => {
          const guestSession = useGuestStore.getState().currentSession;
          if (guestSession) {
            window.location.href = `/chat/${guestSession.id}`;
          }
        }}
      />
      {/* Mention autocomplete dropdown */}
      {mentionOpen && filteredMembers.length > 0 && (
        <div
          ref={mentionListRef}
          className='absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-48 overflow-y-auto'
        >
          <div className='py-1'>
            <p className='px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>
              Mention
            </p>
            {filteredMembers.map((member, idx) => (
              <button
                key={member.id}
                type='button'
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  idx === mentionIndex
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent textarea blur
                  insertMention(member);
                }}
                onMouseEnter={() => setMentionIndex(idx)}
              >
                {member.isAssistant ? (
                  <AssistantAvatar size='xs' />
                ) : (
                  <UserAvatar
                    name={member.displayName}
                    avatarUrl={member.avatarUrl}
                    size='xs'
                  />
                )}
                <span className={member.isAssistant ? 'font-semibold' : ''}>
                  {member.displayName}
                </span>
                {member.isAssistant && (
                  <span className='text-[10px] text-orange-400 ml-auto'>
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm'>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder || (disabled ? 'Đang xử lý...' : 'Ask any question...')
          }
          disabled={disabled}
          className='resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 pt-3 pb-1 min-h-16 max-h-48'
          rows={2}
        />
        <div className='flex items-center justify-between px-3 py-2 bg-white'>
          <label className='flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
            <Switch
              checked={hq}
              onCheckedChange={setHq}
              disabled={disabled}
            />
            <span>High Quality</span>
          </label>
          {
            // Nếu mà user có đánh chứ thì hiên nút send
            text.trim() ? (
              <button
                type='button'
                onClick={handleOnSendClick}
                disabled={disabled}
                className='p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition'
              >
                <Send size={14} />
              </button>
            ) : (
              <>
                {showSigmaButton && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => {
                          if (!isAuthenticated) {
                            // Block only if guest AI limit is exhausted
                            if (
                              !useGuestLimitStore.getState().canMakeAiRequest()
                            ) {
                              setShowGuestAuthModal(true);
                              return;
                            }
                          }
                          onExplainMath?.();
                        }}
                        disabled={disabled}
                        className='w-8 h-8 grid place-items-center rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        <Sigma size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      className='max-w-xs'
                    >
                      <p>
                        Select and drag the cursor over an area containing
                        formulas, equations or tables
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}
