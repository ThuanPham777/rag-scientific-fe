// src/components/session/TypingIndicator.tsx
// Shows who is currently typing in a collaborative session.

import { useSessionStore } from '../../store/useSessionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { UserAvatar } from '../common/UserAvatar';

export default function TypingIndicator() {
  const typingUsers = useSessionStore((s) => s.typingUsers);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Filter out self
  const others = typingUsers.filter(
    (t) => t.isTyping && t.userId !== currentUserId,
  );

  if (others.length === 0) return null;

  const names =
    others.length === 1
      ? others[0].displayName
      : others.length === 2
        ? `${others[0].displayName} và ${others[1].displayName}`
        : `${others[0].displayName} và ${others.length - 1} người khác`;

  return (
    <div className='px-3 py-1.5 flex items-center gap-2 border-t border-gray-100 bg-gray-50/80'>
      {/* Avatar stack */}
      <div className='flex -space-x-1.5'>
        {others.slice(0, 3).map((t) => (
          <UserAvatar
            key={t.userId}
            name={t.displayName}
            avatarUrl={t.avatarUrl}
            size='xs'
            ring='ring-1 ring-white'
          />
        ))}
      </div>

      {/* Name + animated dots */}
      <span className='text-xs text-gray-500'>
        <span className='font-medium text-gray-600'>{names}</span>
        {' đang nhập'}
        <span className='inline-flex ml-0.5 gap-[2px] align-baseline'>
          <span
            className='inline-block w-[3px] h-[3px] bg-gray-400 rounded-full animate-bounce'
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className='inline-block w-[3px] h-[3px] bg-gray-400 rounded-full animate-bounce'
            style={{ animationDelay: '200ms', animationDuration: '1s' }}
          />
          <span
            className='inline-block w-[3px] h-[3px] bg-gray-400 rounded-full animate-bounce'
            style={{ animationDelay: '400ms', animationDuration: '1s' }}
          />
        </span>
      </span>
    </div>
  );
}
