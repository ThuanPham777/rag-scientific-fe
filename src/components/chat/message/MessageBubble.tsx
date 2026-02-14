// src/components/chat/message/MessageBubble.tsx
// Chat message bubble component with avatar, grouping, and timestamp support

import { memo } from 'react';
import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';
import { formatMessageTime } from '../../../utils/formatTimestamp';

interface MessageBubbleProps {
  isUser: boolean;
  children: ReactNode;
  /** Whether this message is grouped with the one above (same sender, close time) */
  isGrouped?: boolean;
  /** Display name for collaborative chat avatar */
  displayName?: string;
  /** Avatar URL (collaborative chat) */
  avatarUrl?: string;
  /** ISO timestamp string */
  timestamp?: string;
  /** Show the timestamp (only shown on last message in a group or on hover) */
  showTimestamp?: boolean;
  /** Whether this is a collaborative session */
  isCollaborative?: boolean;
  /** Whether this message is from the current user (skip avatar for self) */
  isOwnMessage?: boolean;
}

/**
 * Returns initials from a display name (e.g. "John Doe" → "JD", "Alice" → "A")
 */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Deterministic color from a string (for avatar backgrounds)
 */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Styled message bubble container with avatar and grouping
 */
function MessageBubbleBase({
  isUser,
  children,
  isGrouped = false,
  displayName,
  avatarUrl,
  timestamp,
  showTimestamp = false,
  isCollaborative = false,
  isOwnMessage = false,
}: MessageBubbleProps) {
  // Show avatar only in collaborative mode, first message in group, and NOT for own messages
  const showAvatar = isCollaborative && !isGrouped && !isOwnMessage;
  const spacing = isGrouped ? 'mb-0.5' : 'mb-4';

  return (
    <div
      className={`flex w-full ${spacing} ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Left avatar area (assistant / other users in collaborative) */}
      {!isUser && isCollaborative && (
        <div className='w-7 mr-2 flex-shrink-0 flex flex-col items-center justify-end'>
          {showAvatar && (
            <div className='w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm'>
              <Bot
                size={14}
                className='text-white'
              />
            </div>
          )}
        </div>
      )}

      <div
        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[85%]`}
      >
        {/* Sender name (collaborative, first in group only, not for own messages) */}
        {isCollaborative && !isGrouped && displayName && !isOwnMessage && (
          <span className='text-[11px] font-semibold text-gray-500 mb-0.5 ml-1'>
            {displayName}
          </span>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2 shadow-sm border transition-all ${
            isUser
              ? `bg-orange-500 text-white border-orange-500 ${
                  isGrouped ? 'rounded-tr-lg' : 'rounded-br-none'
                }`
              : `bg-white text-gray-800 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                  isGrouped ? 'rounded-tl-lg' : 'rounded-bl-none'
                }`
          } ${!isUser && !isCollaborative ? 'max-w-full' : ''}`}
        >
          {children}
        </div>

        {/* Timestamp */}
        {showTimestamp && timestamp && (
          <span className='text-[10px] text-gray-400 mt-0.5 mx-1 select-none'>
            {formatMessageTime(timestamp)}
          </span>
        )}
      </div>

      {/* Right avatar area (other users' messages on the right side in collaborative) */}
      {isUser && isCollaborative && !isOwnMessage && (
        <div className='w-7 ml-2 flex-shrink-0 flex flex-col items-center justify-end'>
          {showAvatar &&
            (avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'You'}
                className='w-7 h-7 rounded-full object-cover shadow-sm'
              />
            ) : (
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm ${getAvatarColor(displayName || 'U')}`}
              >
                {getInitials(displayName || 'U')}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
