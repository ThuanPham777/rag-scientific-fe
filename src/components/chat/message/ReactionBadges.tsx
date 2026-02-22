// src/components/chat/message/ReactionBadges.tsx
// Reaction summary pill.
//
// Shows emojis in chronological order (firstReactedAt) + total count.
// Position: in-flow at bottom of bubble with negative margin (Facebook-style).
// Hover to show tooltip with who reacted.

import { memo, useState, useRef, useCallback } from 'react';
import type { ReactionAggregate } from '../../../utils/types';
import { ReactionTooltip } from './ReactionTooltip';

interface ReactionBadgesProps {
  reactions: ReactionAggregate[];
  /** Toggle own reaction */
  onToggle: (emoji: string) => void;
  /** Align pill to the right (own message) or left (others) */
  alignRight?: boolean;
}

function ReactionBadgesBase({
  reactions,
  onToggle,
  alignRight = false,
}: ReactionBadgesProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  if (!reactions || reactions.length === 0) return null;

  // Sort strictly by firstReactedAt (chronological) — first emoji to appear stays first.
  // When timestamps are equal or missing, preserve the array order from the server.
  const sorted = [...reactions].sort((a, b) => {
    const tA = a.firstReactedAt ? new Date(a.firstReactedAt).getTime() : 0;
    const tB = b.firstReactedAt ? new Date(b.firstReactedAt).getTime() : 0;
    return tA - tB;
  });

  // Top 3 emojis for display (chronological order)
  const top3 = sorted.slice(0, 3);
  const totalCount = sorted.reduce((sum, r) => sum + r.count, 0);

  // Has current user reacted to anything?
  const userHasReacted = reactions.some((r) => r.hasReacted);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setShowTooltip(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setShowTooltip(false), 200);
  }, []);

  const handlePillClick = useCallback(() => {
    setShowTooltip((prev) => !prev);
  }, []);

  // Keep tooltip open when hovering the portaled tooltip itself
  const handleTooltipMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setShowTooltip(false), 200);
  }, []);

  return (
    <div
      ref={pillRef}
      className='relative inline-flex'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Reaction summary pill ─────────────────────────────── */}
      <button
        type='button'
        onClick={handlePillClick}
        className={`
          inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
          text-xs shadow-sm border cursor-pointer select-none
          transition-all duration-200 hover:shadow-md
          ${
            userHasReacted
              ? 'bg-orange-50 border-orange-300 shadow-orange-100'
              : 'bg-white border-gray-200'
          }
        `}
      >
        {/* Top emojis */}
        <span className='flex items-center -space-x-0.5'>
          {top3.map((r) => (
            <span
              key={r.emoji}
              className='text-sm leading-none'
              style={{ fontSize: '14px' }}
            >
              {r.emoji}
            </span>
          ))}
        </span>
        {/* Total count */}
        <span
          className={`text-[11px] font-medium tabular-nums leading-none ml-0.5 ${
            userHasReacted ? 'text-orange-600' : 'text-gray-500'
          }`}
        >
          {totalCount}
        </span>
      </button>

      {/* ── Tooltip ──────────────────────────────────────────── */}
      {showTooltip && (
        <ReactionTooltip
          reactions={sorted}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggle={onToggle}
          alignRight={alignRight}
          anchorEl={pillRef.current}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </div>
  );
}

export const ReactionBadges = memo(ReactionBadgesBase);
