import { Loader2 } from 'lucide-react';
import { AssistantAvatar } from '../common/UserAvatar';

type Props = {
  label?: string;
  /** Show the assistant avatar column (matches collaborative layout) */
  isCollaborative?: boolean;
};

export default function ChatMessageLoading({
  label = 'Thinking',
  isCollaborative = false,
}: Props) {
  return (
    <div className='flex justify-start mb-0.5'>
      {/* Avatar column — mirrors MessageBubble collaborative layout */}
      {isCollaborative && (
        <div className='w-7 mr-2 flex-shrink-0 flex flex-col items-center justify-end'>
          <AssistantAvatar size='sm' />
        </div>
      )}

      <div className='flex flex-col items-start'>
        {isCollaborative && (
          <span className='text-[11px] font-semibold text-gray-500 mb-0.5 ml-1'>
            Assistant
          </span>
        )}
        <div
          className={`rounded-2xl ${isCollaborative ? 'rounded-bl-none' : 'rounded-bl-none'} px-4 py-2 bg-white text-gray-800 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]`}
        >
          <div className='flex items-center gap-2'>
            <Loader2 className='w-4 h-4 animate-spin text-orange-500' />
            <span className='text-sm text-gray-500 italic flex items-center gap-1'>
              {label}
              <span className='flex gap-0.5'>
                <span className='animate-bounce [animation-delay:0ms]'>.</span>
                <span className='animate-bounce [animation-delay:150ms]'>
                  .
                </span>
                <span className='animate-bounce [animation-delay:300ms]'>
                  .
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
