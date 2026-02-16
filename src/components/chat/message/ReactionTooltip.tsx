// src/components/chat/message/ReactionTooltip.tsx
// Tooltip popup showing who reacted, with tabs per emoji type.
// Appears when hovering the reaction summary pill.

import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ReactionAggregate } from '../../../utils/types';

interface ReactionTooltipProps {
  reactions: ReactionAggregate[];
  /** Currently active emoji tab (null = "All") */
  activeTab: string | null;
  onTabChange: (emoji: string | null) => void;
  onToggle: (emoji: string) => void;
  alignRight?: boolean;
  /** Anchor element for fixed portal positioning */
  anchorEl?: HTMLElement | null;
  /** Mouse enter forwarding (keeps tooltip open when hovering it) */
  onMouseEnter?: () => void;
  /** Mouse leave forwarding */
  onMouseLeave?: () => void;
}

function ReactionTooltipBase({
  reactions,
  activeTab,
  onTabChange,
  alignRight = false,
  anchorEl,
  onMouseEnter,
  onMouseLeave,
}: ReactionTooltipProps) {
  // All users grouped per emoji
  const filteredUsers = useMemo(() => {
    if (activeTab === null) {
      // "All" tab: flatten all reactedBy
      const allUsers: Array<{
        emoji: string;
        userId: string;
        displayName: string;
      }> = [];
      for (const r of reactions) {
        for (const u of r.reactedBy || []) {
          allUsers.push({ emoji: r.emoji, ...u });
        }
      }
      return allUsers;
    }
    const reaction = reactions.find((r) => r.emoji === activeTab);
    return (reaction?.reactedBy || []).map((u) => ({
      emoji: activeTab,
      ...u,
    }));
  }, [reactions, activeTab]);

  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);

  // Render via portal so tooltip is never clipped by overflow containers
  if (!anchorEl) return null;
  const rect = anchorEl.getBoundingClientRect();
  const fixedStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - 8,
    transform: 'translateY(-100%)',
    ...(alignRight
      ? { right: window.innerWidth - rect.right }
      : { left: rect.left }),
    zIndex: 9999,
    animation: 'tooltipIn 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  };

  return createPortal(
    <div
      style={fixedStyle}
      className='bg-white border border-gray-200 rounded-xl shadow-xl min-w-[180px] max-w-[240px] overflow-hidden'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className='flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 overflow-x-auto'>
        {/* All tab */}
        <button
          type='button'
          onClick={() => onTabChange(null)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === null
              ? 'bg-orange-100 text-orange-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          All {totalCount}
        </button>
        {/* Per-emoji tabs */}
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type='button'
            onClick={() => onTabChange(r.emoji)}
            className={`px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-0.5 ${
              activeTab === r.emoji
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <span>{r.emoji}</span>
            <span className='tabular-nums'>{r.count}</span>
          </button>
        ))}
      </div>

      {/* ── User list ───────────────────────────────────────── */}
      <div className='max-h-[160px] overflow-y-auto px-3 py-2 space-y-1.5'>
        {filteredUsers.length === 0 ? (
          <span className='text-xs text-gray-400'>No reactions</span>
        ) : (
          filteredUsers.map((u, i) => (
            <div
              key={`${u.userId}-${u.emoji}-${i}`}
              className='flex items-center gap-2 text-xs'
            >
              <span className='text-sm'>{u.emoji}</span>
              <span className='text-gray-700 font-medium truncate flex-1'>
                {u.displayName}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

export const ReactionTooltip = memo(ReactionTooltipBase);
