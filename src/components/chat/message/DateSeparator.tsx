// src/components/chat/message/DateSeparator.tsx
// Visual separator for day boundaries in the chat timeline

import { memo } from 'react';

interface DateSeparatorProps {
  label: string;
}

function DateSeparatorBase({ label }: DateSeparatorProps) {
  return (
    <div
      className='flex items-center gap-3 py-3 select-none'
      aria-label={label}
    >
      <div className='flex-1 h-px bg-gray-200' />
      <span className='text-[11px] font-medium text-gray-400 tracking-wide uppercase whitespace-nowrap'>
        {label}
      </span>
      <div className='flex-1 h-px bg-gray-200' />
    </div>
  );
}

export const DateSeparator = memo(DateSeparatorBase);
