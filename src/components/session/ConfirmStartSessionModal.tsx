// src/components/session/ConfirmStartSessionModal.tsx
// Confirmation modal shown before creating a collaborative session.

import { Users, X, Loader2 } from 'lucide-react';

interface ConfirmStartSessionModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmStartSessionModal({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmStartSessionModalProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40'
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6'>
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className='absolute top-3 right-3 p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-50'
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className='flex justify-center mb-4'>
          <div className='w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center'>
            <Users
              size={24}
              className='text-indigo-600'
            />
          </div>
        </div>

        {/* Content */}
        <h2 className='text-lg font-semibold text-gray-800 text-center mb-2'>
          Start Collaborative Session?
        </h2>
        <p className='text-sm text-gray-500 text-center mb-6'>
          This will create a shared session for this conversation. You can then
          invite others to chat and annotate the paper together.
        </p>

        {/* Actions */}
        <div className='flex items-center gap-3'>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className='flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className='flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors'
          >
            {isLoading ? (
              <>
                <Loader2
                  size={16}
                  className='animate-spin'
                />
                Creating...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
