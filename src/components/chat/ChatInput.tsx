import { useState } from 'react';
import { Switch, Tooltip } from 'antd';
import { AppTextArea } from '../ui/input/Input';
import { Sigma } from 'lucide-react';

type Props = {
  onSend: (text: string, opts?: { highQuality: boolean }) => void;
  onExplainMath?: () => void; // click nút ∑
};

export default function ChatInput({ onSend, onExplainMath }: Props) {
  const [text, setText] = useState('');
  const [hq, setHq] = useState(false);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t, { highQuality: hq });
    setText('');
  };

  return (
    <div className='px-3 pb-3 bg-white'>
      {/* Khung giống ảnh: viền + bo góc, TextArea borderless */}
      <div className='rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm'>
        <AppTextArea
          variant='borderless'
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setText(e.target.value)
          }
          placeholder='Ask any question...'
          submitOnEnter
          onSubmit={send}
          className='!px-3 !pt-3 !pb-1'
        />

        {/* Hàng điều khiển dưới cùng */}
        <div className='flex items-center justify-between px-3 py-2 bg-white'>
          <label className='flex items-center gap-2 text-sm text-gray-700'>
            <Switch
              size='small'
              checked={hq}
              onChange={setHq}
            />
            <span>High Quality</span>
          </label>

          <Tooltip
            title='Select and drag the cursor over an area containing formulas, equations or tables'
            placement='top'
            getPopupContainer={() => document.body}
          >
            <button
              type='button'
              onClick={onExplainMath}
              className='w-8 h-8 grid place-items-center rounded-md text-gray-700 hover:bg-gray-100'
            >
              <Sigma size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
