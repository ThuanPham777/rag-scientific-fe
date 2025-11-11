import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Trash2,
  BotMessageSquare,
} from 'lucide-react';
import ChatSuggestions from "./ChatSuggestions";
import ChatMessage from './ChatMessage';
import ChatMessageLoading from './ChatMessageLoading';
import ChatInput from './ChatInput';
import type { Session } from '../../utils/types';

type Props = {
  session: Session;
  onSend: (text: string) => void;
  isLoading?: boolean;
  defaultOpen?: boolean;
};

export default function ChatDock({ session, onSend, isLoading = false, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tự động mở chat khi có message mới (để user thấy response từ PDF action)
  useEffect(() => {
    if (session.messages.length > 0 && !open) {
      setOpen(true);
    }
  }, [session.messages.length, open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, session.messages.length, isLoading]);

  // Kích thước cửa sổ chat
  const WIDTH = 'w-[450px]';
  const HEIGHT = 'h-[81vh]';
  return (
    <>
      {/* Chat nổi cố định */}
      {open && (
        <div
          className={`fixed right-4 bottom-4 z-50 ${WIDTH} ${HEIGHT} bg-white border border-gray-200 rounded-lg flex flex-col pointer-events-auto`}
          role='dialog'
          aria-label='Chat'
        >
          {/* Header */}
          <div className='px-4 py-2 border-b border-b-gray-200 flex items-center justify-between'>
            <div className='flex items-center gap-2 font-semibold'>
              <span>
                <BotMessageSquare className='text-orange-500' />
              </span>
              <span>Chat</span>
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-600'>
              <button
                className='p-1.5 rounded hover:bg-gray-50'
                title='Language'
              >
                <Globe size={16} />
              </button>
              <button
                className='p-1.5 rounded hover:bg-gray-50'
                title='Clear messages'
                onClick={() => console.log('TODO: clear messages')}
              >
                <Trash2 size={16} />
              </button>
              <button
                className='p-1.5 rounded hover:bg-gray-50'
                title='Minimize'
                onClick={() => setOpen(false)}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* 🔹 Suggestions */}
          {session.messages.length === 0 && <ChatSuggestions onSelect={onSend} disabled={isLoading} />}

          {/* Messages */}
          <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0'>
            {session.messages.map((m) => (
              <ChatMessage
                key={m.id}
                msg={m}
              />
            ))}
            {isLoading && <ChatMessageLoading />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={onSend} disabled={isLoading} />
        </div>
      )}

      {/* Thanh thu gọn (cũng fixed, không cuộn) */}
      {!open && (
        <div className={`fixed right-4 bottom-3 z-40 ${WIDTH}`}>
          <button
            className='w-full bg-white border border-gray-300 rounded-lg flex items-center justify-between px-4 py-3 hover:bg-gray-50'
            onClick={() => setOpen(true)}
            aria-expanded='false'
          >
            <span className='flex items-center gap-2'>
              <span>
                <BotMessageSquare className='text-orange-500' />
              </span>
              <span className='font-medium'>Chat</span>
            </span>
            <ChevronUp size={18} />
          </button>
        </div>
      )}
    </>
  );
}
