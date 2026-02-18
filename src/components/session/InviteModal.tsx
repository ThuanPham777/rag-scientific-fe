// src/components/session/InviteModal.tsx
// Modal for managing invite links for a collaborative session.

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Link2,
  X,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  useActiveInvite,
  useCreateInvite,
  useResetInvite,
  useDeleteInvite,
  sessionKeys,
} from '../../hooks';
import { useQueryClient } from '@tanstack/react-query';

interface InviteModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({
  conversationId,
  isOpen,
  onClose,
}: InviteModalProps) {
  const queryClient = useQueryClient();
  const { data: activeInviteRes, isLoading: isLoadingInvite } = useActiveInvite(
    isOpen ? conversationId : undefined,
  );
  const createInviteMutation = useCreateInvite();
  const resetInviteMutation = useResetInvite();
  const deleteInviteMutation = useDeleteInvite();

  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeInvite = activeInviteRes?.data ?? null;

  // Build frontend link from invite data
  const inviteLink = activeInvite
    ? activeInvite.inviteLink ||
      `${window.location.origin}/session/join/${activeInvite.inviteToken}`
    : null;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Reset local state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setMenuOpen(false);
    }
  }, [isOpen]);

  const handleCreate = useCallback(async () => {
    try {
      await createInviteMutation.mutateAsync({
        conversationId,
        maxUses: 0,
        expiresInHours: 48,
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.activeInvite(conversationId),
      });
    } catch {
      // Error handled by mutation hook toast
    }
  }, [conversationId, createInviteMutation, queryClient]);

  const handleCopy = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [inviteLink]);

  const handleReset = useCallback(async () => {
    setMenuOpen(false);
    try {
      await resetInviteMutation.mutateAsync(conversationId);
    } catch {
      // Error handled by mutation hook toast
    }
  }, [conversationId, resetInviteMutation]);

  const handleDelete = useCallback(async () => {
    setMenuOpen(false);
    try {
      await deleteInviteMutation.mutateAsync(conversationId);
    } catch {
      // Error handled by mutation hook toast
    }
  }, [conversationId, deleteInviteMutation]);

  if (!isOpen) return null;

  const isActionPending =
    resetInviteMutation.isPending || deleteInviteMutation.isPending;

  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
            <Link2
              size={18}
              className='text-indigo-600'
            />
            Invite to Session
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded hover:bg-gray-100 text-gray-400'
          >
            <X size={18} />
          </button>
        </div>

        <p className='text-sm text-gray-500 mb-4'>
          Share this link with others to let them join your collaborative
          session.
        </p>

        {/* Content */}
        {isLoadingInvite ? (
          <div className='flex items-center justify-center py-6'>
            <Loader2
              size={20}
              className='animate-spin text-indigo-500'
            />
            <span className='ml-2 text-sm text-gray-500'>Loading...</span>
          </div>
        ) : inviteLink ? (
          /* Case A: Invite link exists */
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                readOnly
                value={inviteLink}
                className='flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 select-all truncate'
              />
              <button
                onClick={handleCopy}
                disabled={isActionPending}
                className='flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50'
              >
                {copied ? (
                  <Check
                    size={14}
                    className='text-green-600'
                  />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {/* Three-dot menu */}
              <div
                className='relative'
                ref={menuRef}
              >
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  disabled={isActionPending}
                  className='p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50'
                >
                  {isActionPending ? (
                    <Loader2
                      size={16}
                      className='animate-spin'
                    />
                  ) : (
                    <MoreHorizontal size={16} />
                  )}
                </button>

                {menuOpen && (
                  <div className='absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10'>
                    <button
                      onClick={handleReset}
                      className='w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
                    >
                      <RefreshCw size={14} />
                      Reset link
                    </button>
                    <button
                      onClick={handleDelete}
                      className='w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
                    >
                      <Trash2 size={14} />
                      Delete link
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className='text-xs text-gray-400'>
              This link can be used to join the session.
            </p>
          </div>
        ) : (
          /* Case B: No invite link exists */
          <button
            onClick={handleCreate}
            disabled={createInviteMutation.isPending}
            className='w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors'
          >
            {createInviteMutation.isPending ? (
              <>
                <Loader2
                  size={16}
                  className='animate-spin'
                />
                Creating...
              </>
            ) : (
              <>
                <Link2 size={16} />
                Create invite link
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
