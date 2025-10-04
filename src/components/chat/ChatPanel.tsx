import { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { Session } from '../../utils/types';

type Props = {
  session: Session;
  onSend: (text: string) => void;
};

export default function ChatPanel({ session, onSend }: Props) {
  const [suggestions] = useState([
    'Methods used',
    'Contributions',
    'Explain Abstract',
    'Related Papers',
    'Limitations',
    'Dataset used',
    'Future works',
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages.length]);

  return (
    <aside className='bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col'>
      {/* header */}
      <div className='px-4 py-3 border-b border-b-gray-200 flex items-center justify-between flex-shrink-0'>
        <div className='font-semibold flex items-center gap-2'>
          <span>🧠</span> Chat
        </div>
        <div className='flex items-center gap-3 text-sm text-gray-600'>
          <span>en ▾</span>
          <span className='text-xs text-gray-400'>
            Session {session.id.slice(0, 6)}…
          </span>
        </div>
      </div>

      {/* chips */}
      <div className='px-4 pt-4 flex-shrink-0'>
        <div className='flex flex-wrap gap-2'>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className='px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-gray-50'
              onClick={() => onSend(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* messages */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50 min-h-0'>
        {session.messages.map((m) => (
          <ChatMessage
            key={m.id}
            msg={m}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={onSend} />
    </aside>
  );
}
