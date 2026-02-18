// src/components/session/MembersModal.tsx
// Modal to display all members in a collaborative session.
// Shows online status, role badges, and invite button.

import { X, UserPlus, Circle } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import type { SessionDetail, OnlineMember } from '../../utils/types';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDetail: SessionDetail;
  onlineMembers: OnlineMember[];
  onInvite: () => void;
}

export default function MembersModal({
  isOpen,
  onClose,
  sessionDetail,
  onlineMembers,
  onInvite,
}: MembersModalProps) {
  if (!isOpen) return null;

  const handleInviteClick = () => {
    onClose();
    onInvite();
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 flex items-center justify-center z-[200]'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Session Members ({sessionDetail.memberCount}/
            {sessionDetail.maxMembers})
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Members List */}
        <div className='max-h-[400px] overflow-y-auto px-4 py-2'>
          {sessionDetail.members.map((member) => {
            const isOnline = onlineMembers.some(
              (m) => m.userId === member.userId,
            );
            const isOwner = member.role === 'OWNER';

            return (
              <div
                key={member.userId}
                className='flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50 transition-colors'
              >
                {/* Avatar */}
                <div className='relative'>
                  <UserAvatar
                    name={member.displayName}
                    avatarUrl={member.avatarUrl}
                    size='sm'
                  />
                  {/* Online indicator */}
                  {isOnline && (
                    <Circle
                      size={10}
                      className='absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500'
                    />
                  )}
                </div>

                {/* Member info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-900 truncate'>
                      {member.displayName}
                    </span>
                    {isOwner && (
                      <span className='px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700'>
                        OWNER
                      </span>
                    )}
                  </div>
                  <span className='text-xs text-gray-500'>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Invite Button */}
        <div className='px-4 py-3 border-t border-gray-200'>
          <button
            onClick={handleInviteClick}
            className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors'
          >
            <UserPlus size={16} />
            Invite New Member
          </button>
        </div>
      </div>
    </div>
  );
}
