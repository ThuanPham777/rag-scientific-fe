// src/components/session/MembersList.tsx
// List of session members with online status & owner badge.

import { Crown, UserMinus, Circle } from 'lucide-react';
import { useSessionStore } from '../../store/useSessionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { UserAvatar } from '../common/UserAvatar';
import type { SessionDetail } from '../../utils/types';

interface MembersListProps {
  sessionDetail: SessionDetail;
  onRemoveMember?: (userId: string) => void;
}

export default function MembersList({
  sessionDetail,
  onRemoveMember,
}: MembersListProps) {
  const onlineMembers = useSessionStore((s) => s.onlineMembers);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwner = sessionDetail.members.some(
    (m) => m.userId === currentUserId && m.role === 'OWNER',
  );
  const onlineSet = new Set(onlineMembers.map((m) => m.userId));

  return (
    <div className='p-3 space-y-2'>
      <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
        Members ({sessionDetail.memberCount}/{sessionDetail.maxMembers})
      </h3>

      {sessionDetail.members.map((member) => {
        const isOnline = onlineSet.has(member.userId);
        const isSelf = member.userId === currentUserId;

        return (
          <div
            key={member.userId}
            className='flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50'
          >
            {/* Avatar */}
            <div className='relative'>
              <UserAvatar
                name={member.displayName}
                avatarUrl={member.avatarUrl}
                size='md'
              />
              {/* Online indicator */}
              <Circle
                size={8}
                className={`absolute -bottom-0.5 -right-0.5 ${
                  isOnline
                    ? 'fill-green-500 text-green-500'
                    : 'fill-gray-300 text-gray-300'
                }`}
              />
            </div>

            {/* Name + role */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-1'>
                <span className='text-sm font-medium text-gray-800 truncate'>
                  {member.displayName}
                  {isSelf && (
                    <span className='text-xs text-gray-400 ml-1'>(you)</span>
                  )}
                </span>
                {member.role === 'OWNER' && (
                  <Crown
                    size={12}
                    className='text-amber-500 flex-shrink-0'
                  />
                )}
              </div>
              <span className='text-[11px] text-gray-400'>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Remove button (owner only, not self) */}
            {isOwner && !isSelf && onRemoveMember && (
              <button
                onClick={() => onRemoveMember(member.userId)}
                className='p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors'
                title='Remove member'
              >
                <UserMinus size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
