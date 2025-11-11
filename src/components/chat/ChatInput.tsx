import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sigma } from 'lucide-react';

type Props = {
  onSend: (text: string, opts?: { highQuality: boolean }) => void;
  onExplainMath?: () => void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, onExplainMath, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [hq, setHq] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 64; // min-h-16
      const maxHeight = 192; // max-h-48 (6 rows * 32px)
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t, { highQuality: hq });
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className='px-3 pb-3 bg-white'>
      <div className='rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm'>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Đang xử lý...' : 'Ask any question...'}
          disabled={disabled}
          className='resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 pt-3 pb-1 min-h-16 max-h-48'
          rows={2}
        />
        <div className='flex items-center justify-between px-3 py-2 bg-white'>
          <label className='flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
            <Switch
              checked={hq}
              onCheckedChange={setHq}
              disabled={disabled}
            />
            <span>High Quality</span>
          </label>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                onClick={onExplainMath}
                disabled={disabled}
                className='w-8 h-8 grid place-items-center rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Sigma size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side='top' className='max-w-xs'>
              <p>Select and drag the cursor over an area containing formulas, equations or tables</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
