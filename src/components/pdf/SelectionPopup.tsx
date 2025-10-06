import { useRef } from 'react';
import {
  Highlighter,
  ListTree,
  NotebookPen,
  PanelRightOpen,
  TextQuote,
} from 'lucide-react';

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  selection: {
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
    anchor: { x: number; y: number };
  };
  scale: number;
  onAction: (
    action: 'explain' | 'summarize' | 'related' | 'highlight' | 'save',
    payload: { text: string; pageNumber: number; rects: HighlightRect[] }
  ) => void;
  onAddHighlight: () => void;
};

export default function SelectionPopup({
  selection,
  scale,
  onAction,
  onAddHighlight,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Tính toán kích thước popup dựa trên scale
  const popupWidth = Math.max(200, Math.min(320, 200 + (scale - 1) * 50));
  const fontSize = Math.max(12, Math.min(16, 12 + (scale - 1) * 2));

  const fire = (type: Parameters<typeof onAction>[0]) => {
    onAction(type, {
      text: selection.text,
      pageNumber: selection.pageNumber,
      rects: selection.rects,
    });
  };

  return (
    <div
      ref={popupRef}
      className='absolute z-20'
      style={{
        left: selection.anchor.x,
        top: selection.anchor.y,
        width: `${popupWidth}px`,
      }}
    >
      <div
        className='rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden'
        style={{ fontSize: `${fontSize}px` }}
      >
        <button
          className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
          onClick={() => fire('explain')}
        >
          <TextQuote size={16} /> Explain text
        </button>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
          onClick={() => fire('summarize')}
        >
          <ListTree size={16} /> Summarize
        </button>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
          onClick={() => fire('related')}
        >
          <PanelRightOpen size={16} /> Get Related papers
        </button>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
          onClick={onAddHighlight}
        >
          <Highlighter size={16} /> Highlight
        </button>
        <button
          className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
          onClick={() => fire('save')}
        >
          <NotebookPen size={16} /> Save to notebook
        </button>
      </div>
    </div>
  );
}
