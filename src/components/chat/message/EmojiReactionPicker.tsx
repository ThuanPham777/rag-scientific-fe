// src/components/chat/message/EmojiReactionPicker.tsx
// quick emoji reaction bar.
// Appears above the message bubble on hover with fade + scale animation.

import { memo, useRef, useEffect } from 'react';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Align the picker to the right (for own messages) */
  alignRight?: boolean;
}

function EmojiReactionPickerBase({
  onSelect,
  onClose,
  alignRight = false,
}: EmojiReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-2 ${alignRight ? '-right-24' : '-left-24'}
        bg-white border border-gray-200 rounded-full shadow-lg
        px-2 py-1.5 flex items-center gap-1 z-50
        animate-reaction-bar`}
      style={{
        animation:
          'reactionBarIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      {QUICK_EMOJIS.map((emoji, i) => (
        <button
          key={emoji}
          type='button'
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className='w-8 h-8 flex items-center justify-center rounded-full
            hover:bg-gray-100 active:scale-90
            transition-all duration-150 text-lg
            hover:scale-[1.35] hover:-translate-y-1'
          style={{
            animation: `emojiPopIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms both`,
          }}
        >
          {emoji}
        </button>
      ))}

      {/* Inline keyframes */}
      <style>{`
        @keyframes reactionBarIn {
          from { opacity: 0; transform: scale(0.8) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes emojiPopIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export const EmojiReactionPicker = memo(EmojiReactionPickerBase);
