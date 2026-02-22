// src/components/chat/message/SystemMessage.tsx
// Lightweight inline message for session events (user joined, user left, etc.)

interface SystemMessageProps {
  text: string;
  timestamp?: string;
}

export function SystemMessage({ text, timestamp }: SystemMessageProps) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className='flex items-center justify-center gap-2 py-1.5 select-none'>
      <div className='h-px flex-1 bg-gray-100' />
      <span className='text-[11px] text-gray-400 whitespace-nowrap'>
        {text}
        {time && <span className='ml-1 opacity-60'>· {time}</span>}
      </span>
      <div className='h-px flex-1 bg-gray-100' />
    </div>
  );
}
