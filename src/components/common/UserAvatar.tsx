// src/components/common/UserAvatar.tsx
// Shared avatar component used across the app:
// - TopNav (user profile)
// - Chat messages (collaborative session)
// - SessionBar (online members)
// - MembersList (full member list)

import { memo } from 'react';
import { Bot } from 'lucide-react';

// ─── Size presets ──────────────────────────────────────────────
const sizes = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', icon: 12 },
  sm: { container: 'w-7 h-7', text: 'text-[11px]', icon: 14 },
  md: { container: 'w-8 h-8', text: 'text-xs', icon: 16 },
  lg: { container: 'w-10 h-10', text: 'text-sm', icon: 20 },
} as const;

type AvatarSize = keyof typeof sizes;

interface UserAvatarProps {
  /** User's display name (used for initials + color) */
  name?: string;
  /** URL of user avatar image */
  avatarUrl?: string | null;
  /** Predefined size */
  size?: AvatarSize;
  /** Extra ring styling (e.g. 'ring-2 ring-white') */
  ring?: string;
  /** Extra CSS classes on the container */
  className?: string;
}

interface AssistantAvatarProps {
  /** Predefined size */
  size?: AvatarSize;
  /** Extra CSS classes on the container */
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

/** Extract up to 2 initials from a display name */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Deterministic Tailwind bg-color from a string */
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-indigo-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Components ────────────────────────────────────────────────

/**
 * Avatar for a real user. Shows image when available, initials fallback otherwise.
 */
function UserAvatarBase({
  name,
  avatarUrl,
  size = 'sm',
  ring = '',
  className = '',
}: UserAvatarProps) {
  const s = sizes[size];
  const displayName = name || 'U';
  const hasImage = typeof avatarUrl === 'string' && avatarUrl.trim().length > 0;

  if (hasImage) {
    return (
      <img
        src={avatarUrl!}
        alt={displayName}
        referrerPolicy='no-referrer'
        className={`${s.container} rounded-full object-cover shadow-sm ${ring} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${s.container} rounded-full flex items-center justify-center text-white font-bold shadow-sm ${s.text} ${getAvatarColor(displayName)} ${ring} ${className}`}
      title={displayName}
    >
      {getInitials(displayName)}
    </div>
  );
}

/**
 * Avatar for the AI assistant. Orange gradient with bot icon.
 */
function AssistantAvatarBase({
  size = 'sm',
  className = '',
}: AssistantAvatarProps) {
  const s = sizes[size];
  return (
    <div
      className={`${s.container} rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm ${className}`}
      title='Assistant'
    >
      <Bot
        size={s.icon}
        className='text-white'
      />
    </div>
  );
}

export const UserAvatar = memo(UserAvatarBase);
export const AssistantAvatar = memo(AssistantAvatarBase);
