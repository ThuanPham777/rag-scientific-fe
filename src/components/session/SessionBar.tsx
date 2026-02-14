// src/components/session/SessionBar.tsx
// Compact toolbar shown above the chat when in a collaborative session.
// Displays online members, invite button, and session controls.

import { useState } from 'react';
import { Users, Link2, LogOut, X } from 'lucide-react';
import { useSessionStore } from '../../store/useSessionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { UserAvatar } from '../common/UserAvatar';
import type { SessionDetail, OnlineMember } from '../../utils/types';

interface SessionBarProps {
  sessionDetail: SessionDetail | undefined;
  onInvite: () => void;
  onLeave: () => void;
  onEnd: () => void;
}

export default function SessionBar({
  sessionDetail,
  onInvite,
  onLeave,
  onEnd,
}: SessionBarProps) {
  const onlineMembers = useSessionStore((s) => s.onlineMembers);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwner = sessionDetail?.members.some(
    (m) => m.userId === currentUserId && m.role === 'OWNER',
  );

  const [showMenu, setShowMenu] = useState(false);

  if (!sessionDetail) return null;

  return (
    <div className='flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 text-sm'>
      {/* Session badge */}
      <span className='flex items-center gap-1 text-indigo-700 font-medium'>
        <Users size={14} />
        <span>Session</span>
        <span className='ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold'>
          {sessionDetail.members.length}/{sessionDetail.maxMembers}
        </span>
      </span>

      {/* Online member avatars */}
      <div className='flex -space-x-1.5 ml-1'>
        {onlineMembers.slice(0, 5).map((m) => (
          <MemberAvatar
            key={m.userId}
            member={m}
          />
        ))}
        {onlineMembers.length > 5 && (
          <span className='w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white'>
            +{onlineMembers.length - 5}
          </span>
        )}
      </div>

      <div className='flex-1' />

      {/* Invite button (owner only) */}
      {isOwner && (
        <button
          onClick={onInvite}
          className='flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors'
          title='Copy invite link'
        >
          <Link2 size={13} />
          Invite
        </button>
      )}

      {/* Leave / End Session */}
      <div className='relative'>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className='p-1 rounded hover:bg-indigo-100 text-indigo-500 transition-colors'
          title='Session options'
        >
          <LogOut size={14} />
        </button>

        {showMenu && (
          <div className='absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40 py-1'>
            {isOwner ? (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEnd();
                }}
                className='w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2'
              >
                <X size={14} />
                End Session
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onLeave();
                }}
                className='w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2'
              >
                <LogOut size={14} />
                Leave Session
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberAvatar({ member }: { member: OnlineMember }) {
  return (
    <UserAvatar
      name={member.displayName}
      avatarUrl={member.avatarUrl}
      size='xs'
      ring='ring-2 ring-white'
    />
  );
}
