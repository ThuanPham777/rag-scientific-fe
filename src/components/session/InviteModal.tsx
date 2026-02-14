// src/components/session/InviteModal.tsx
// Modal for generating and sharing invite links for a collaborative session.

import { useState, useCallback } from 'react';
import { Copy, Check, Link2, X, Loader2 } from 'lucide-react';
import { useCreateInvite } from '../../hooks';

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
  const createInviteMutation = useCreateInvite();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    try {
      const result = await createInviteMutation.mutateAsync({
        conversationId,
        maxUses: 10,
        expiresInHours: 24,
      });
      // Build a frontend invite link from the token
      const token = result.data.inviteToken;
      const link = `${window.location.origin}/session/join/${token}`;
      setInviteLink(link);
    } catch {
      // Error handled by mutation hook toast
    }
  }, [conversationId, createInviteMutation]);

  const handleCopy = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [inviteLink]);

  if (!isOpen) return null;

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
          Generate a link to share with others. They can join your collaborative
          session to chat and annotate the paper together.
        </p>

        {/* Generate / Display */}
        {!inviteLink ? (
          <button
            onClick={handleGenerate}
            disabled={createInviteMutation.isPending}
            className='w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors'
          >
            {createInviteMutation.isPending ? (
              <>
                <Loader2
                  size={16}
                  className='animate-spin'
                />
                Generating...
              </>
            ) : (
              <>
                <Link2 size={16} />
                Generate Invite Link
              </>
            )}
          </button>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                readOnly
                value={inviteLink}
                className='flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 select-all'
              />
              <button
                onClick={handleCopy}
                className='flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-medium hover:bg-indigo-200 transition-colors'
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
            </div>
            <p className='text-xs text-gray-400'>
              This link expires in 24 hours and can be used up to 10 times.
            </p>
            <button
              onClick={() => {
                setInviteLink(null);
                setCopied(false);
              }}
              className='text-xs text-indigo-600 hover:underline'
            >
              Generate new link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
