// src/components/session/TypingIndicator.tsx
// Shows who is currently typing in a collaborative session.

import { useSessionStore } from '../../store/useSessionStore';
import { useAuthStore } from '../../store/useAuthStore';

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
        ? `${others[0].displayName} and ${others[1].displayName}`
        : `${others[0].displayName} and ${others.length - 1} others`;

  return (
    <div className='px-4 py-1 text-xs text-gray-400 flex items-center gap-1.5'>
      <span className='flex gap-0.5'>
        <span
          className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'
          style={{ animationDelay: '0ms' }}
        />
        <span
          className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'
          style={{ animationDelay: '150ms' }}
        />
        <span
          className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'
          style={{ animationDelay: '300ms' }}
        />
      </span>
      <span>
        {names} {others.length === 1 ? 'is' : 'are'} typing…
      </span>
    </div>
  );
}
