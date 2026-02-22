// src/components/chat/message/EmojiReactionPicker.tsx
// quick emoji reaction bar.
// Appears above the message bubble on hover with fade + scale animation.

import { memo, useRef, useEffect, useMemo } from 'react';
import type { ReactionAggregate } from '../../../utils/types';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Align the picker to the right (for own messages) */
  alignRight?: boolean;
  /** Reactions on this message — used to highlight emojis the current user has reacted with */
  reactions?: ReactionAggregate[];
}

function EmojiReactionPickerBase({
  onSelect,
  onClose,
  alignRight = false,
  reactions,
}: EmojiReactionPickerProps) {
  // Build a set of emojis the logged-in user has reacted with
  const myReactedEmojis = useMemo(() => {
    const set = new Set<string>();
    if (reactions) {
      for (const r of reactions) {
        if (r.hasReacted) set.add(r.emoji);
      }
    }
    return set;
  }, [reactions]);
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
      {QUICK_EMOJIS.map((emoji, i) => {
        const isActive = myReactedEmojis.has(emoji);
        return (
          <button
            key={emoji}
            type='button'
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-full
              active:scale-90 transition-all duration-150 text-lg
              hover:scale-[1.35] hover:-translate-y-1
              ${
                isActive
                  ? 'bg-orange-100 ring-2 ring-orange-400 scale-110'
                  : 'hover:bg-gray-100'
              }`}
            style={{
              animation: `emojiPopIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms both`,
            }}
          >
            {emoji}
          </button>
        );
      })}

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
