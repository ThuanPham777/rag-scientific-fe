import { useState } from 'react';
import Input from '../UI/input/Input';

export default function ChatInput({
  onSend,
}: {
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className='border-t border-t-gray-200 p-3 bg-white flex items-center gap-2'>
      <Input
        placeholder='Ask about the paper…'
        className='flex-1 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400'
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            onSend(text.trim());
            setText('');
          }
        }}
      />
      <button
        className='px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700'
        onClick={() => {
          if (text.trim()) {
            onSend(text.trim());
            setText('');
          }
        }}
      >
        Send
      </button>
    </div>
  );
}
