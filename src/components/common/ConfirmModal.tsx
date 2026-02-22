// src/components/common/ConfirmModal.tsx
// Generic confirmation modal for various actions

import { X, AlertTriangle, Info, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  icon: CustomIcon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  // Determine icon and colors based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: CustomIcon || Trash2,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: CustomIcon || AlertTriangle,
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          confirmBg: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'info':
      default:
        return {
          icon: CustomIcon || Info,
          iconBg: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
          confirmBg: 'bg-indigo-600 hover:bg-indigo-700',
        };
    }
  };

  const { icon: Icon, iconBg, iconColor, confirmBg } = getVariantStyles();

  return (
    <div className='fixed inset-0 z-[200] flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/40'
        onClick={onCancel}
      />

      {/* Modal */}
      <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6'>
        {/* Close button */}
        <button
          onClick={onCancel}
          className='absolute top-3 right-3 p-1 rounded hover:bg-gray-100 text-gray-400'
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className='flex justify-center mb-4'>
          <div
            className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}
          >
            <Icon
              size={24}
              className={iconColor}
            />
          </div>
        </div>

        {/* Content */}
        <h2 className='text-lg font-semibold text-gray-800 text-center mb-2'>
          {title}
        </h2>
        <p className='text-sm text-gray-500 text-center mb-6 whitespace-pre-line'>
          {message}
        </p>

        {/* Actions */}
        <div className='flex items-center gap-3'>
          <button
            onClick={onCancel}
            className='flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors'
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
