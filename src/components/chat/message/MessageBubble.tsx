// src/components/chat/message/MessageBubble.tsx
// Chat message bubble component with correct alignment and shared avatar.
//
// Alignment rules (like standard messaging apps):
//   MY messages     → RIGHT, primary color (orange)
//   OTHER messages  → LEFT,  neutral color (white)
//   ASSISTANT       → LEFT,  neutral color (white), bot avatar
//
// `isOwnMessage` is the ONLY signal for alignment in collaborative mode,
// NOT `isUser` or `role`.

import { memo, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { UserAvatar, AssistantAvatar } from '../../common/UserAvatar';
import { formatHoverTimestamp } from '../../../utils/formatTimestamp';
import { HoverTimestamp } from './HoverTimestamp';

interface MessageBubbleProps {
  /** true when msg.role === 'user' */
  isUser: boolean;
  children: ReactNode;
  /** Grouped with bubble above (same sender, close time) */
  isGrouped?: boolean;
  /** Display name for avatar / sender label */
  displayName?: string;
  /** Avatar URL from backend */
  avatarUrl?: string;
  /** ISO timestamp */
  timestamp?: string;
  /** Show the timestamp line (kept for API compat, but now timestamp shows on hover) */
  showTimestamp?: boolean;
  /** Collaborative session? (shows avatars + sender name) */
  isCollaborative?: boolean;
  /** This message belongs to the current user */
  isOwnMessage?: boolean;
  /** Hover action toolbar rendered relative to the bubble */
  hoverActions?: ReactNode;
  /** Reaction badges rendered at the bottom corner of the bubble */
  reactionBadges?: ReactNode;
}

function MessageBubbleBase({
  isUser,
  children,
  isGrouped = false,
  displayName,
  avatarUrl,
  timestamp,
  isCollaborative = false,
  isOwnMessage = false,
  hoverActions,
  reactionBadges,
}: MessageBubbleProps) {
  const isAssistant = !isUser;
  const [showTs, setShowTs] = useState(false);
  const tsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleContentRef = useRef<HTMLDivElement>(null);

  // Show timestamp only when hovering the actual message bubble content
  const handleBubbleEnter = useCallback(() => {
    if (tsTimerRef.current) clearTimeout(tsTimerRef.current);
    setShowTs(true);
  }, []);

  const handleBubbleLeave = useCallback(() => {
    tsTimerRef.current = setTimeout(() => setShowTs(false), 150);
  }, []);

  const hoverTimeStr = formatHoverTimestamp(timestamp);

  // ── Non-collaborative: simple Q&A layout ───────────────────
  if (!isCollaborative) {
    return (
      <div
        className={`relative flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'} ${isUser ? 'max-w-[60%]' : 'max-w-full'}`}
        >
          <div className='group relative max-w-full'>
            {/* Hover timestamp — portal, anchored to the bubble content */}
            {showTs && hoverTimeStr && (
              <HoverTimestamp
                text={hoverTimeStr}
                anchorEl={bubbleContentRef.current}
                alignRight={isUser}
              />
            )}
            {/* Hover actions */}
            {hoverActions}
            <div
              ref={bubbleContentRef}
              onMouseEnter={handleBubbleEnter}
              onMouseLeave={handleBubbleLeave}
              className={`relative px-4 py-2 break-all overflow-hidden cursor-default ${
                isUser
                  ? 'bg-orange-500 text-white rounded-2xl rounded-br-none shadow-sm border border-orange-500'
                  : 'bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border rounded-2xl rounded-bl-none'
              }`}
            >
              {children}
            </div>
          </div>
          {/* Reaction badges — in-flow with negative margin to overlap bubble edge (Facebook-style) */}
          {reactionBadges && (
            <div
              className={`-mt-2 ${isUser ? 'mr-1' : 'ml-1'} z-10`}
            >
              {reactionBadges}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collaborative: full chat-app layout ────────────────────
  const alignRight = isOwnMessage;

  // Show avatar on the left for "other" messages (first in a group only).
  const showLeftAvatar = !alignRight && !isGrouped;

  return (
    <div
      className={`relative flex w-full mb-0.5 ${alignRight ? 'justify-end' : 'justify-start'}`}
    >
      {/* ── Left avatar column ───────────────────────────────── */}
      {!alignRight && (
        <div className='w-7 mr-2 flex-shrink-0 flex flex-col items-center justify-end'>
          {showLeftAvatar &&
            (isAssistant ? (
              <AssistantAvatar size='sm' />
            ) : (
              <UserAvatar
                name={displayName}
                avatarUrl={avatarUrl}
                size='sm'
              />
            ))}
        </div>
      )}

      {/* ── Message column ───────────────────────────────────── */}
      <div
        className={`flex flex-col min-w-0 ${alignRight ? 'items-end' : 'items-start'} ${isUser ? 'max-w-[60%]' : 'max-w-[90%] md:max-w-[85%]'}`}
      >
        {/* Sender name (first in group, NOT own message) */}
        {!isGrouped && !alignRight && displayName && (
          <span className='text-[11px] font-semibold text-gray-500 mb-0.5 ml-1'>
            {isAssistant ? 'Assistant' : displayName}
          </span>
        )}

        {/* Bubble */}
        <div className='group relative max-w-full'>
          {/* Hover timestamp */}
          {showTs && hoverTimeStr && (
            <HoverTimestamp
              text={hoverTimeStr}
              anchorEl={bubbleContentRef.current}
              alignRight={alignRight}
            />
          )}
          {/* Hover actions */}
          {hoverActions}
          <div
            ref={bubbleContentRef}
            onMouseEnter={handleBubbleEnter}
            onMouseLeave={handleBubbleLeave}
            className={`relative rounded-2xl px-4 py-2 shadow-sm border transition-all break-all overflow-hidden cursor-default ${
              alignRight
                ? `bg-orange-500 text-white border-orange-500 ${
                    isGrouped ? 'rounded-tr-lg' : 'rounded-br-none'
                  }`
                : `bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                    isGrouped ? 'rounded-tl-lg' : 'rounded-bl-none'
                  }`
            }`}
          >
            {children}
          </div>
        </div>
        {/* Reaction badges — in-flow with negative margin (Facebook-style: overlaps bubble, doesn't overlap next message) */}
        {reactionBadges && (
          <div
            className={`-mt-2 ${alignRight ? 'mr-1' : 'ml-1'} z-10`}
          >
            {reactionBadges}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
