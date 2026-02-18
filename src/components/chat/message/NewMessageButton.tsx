// src/components/chat/message/NewMessageButton.tsx
// Floating button shown when user has scrolled up and new messages arrive below

import { memo } from 'react';
import { ArrowDown } from 'lucide-react';

interface NewMessageButtonProps {
  count: number;
  onClick: () => void;
}

function NewMessageButtonBase({ count, onClick }: NewMessageButtonProps) {
  if (count <= 0) return null;

  return (
    <button
      onClick={onClick}
      className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium shadow-lg hover:bg-orange-600 transition-all animate-in slide-in-from-bottom-2 fade-in duration-200'
    >
      <ArrowDown size={14} />
      <span>
        {count} new message{count !== 1 ? 's' : ''}
      </span>
    </button>
  );
}

export const NewMessageButton = memo(NewMessageButtonBase);
