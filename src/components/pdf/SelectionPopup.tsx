import { useRef, useState } from 'react';
import {
  Highlighter,
  ListTree,
  NotebookPen,
  PanelRightOpen,
  TextQuote,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ColorPopup from './ColorPopup';

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
    payload: {
      text: string;
      pageNumber: number;
      rects: HighlightRect[];
      color?: string;
    }
  ) => void;
  onAddHighlight: (color?: string) => void;
  onRemoveHighlight?: () => void;
  selectedColorDefault?: string;
  onSelectedColorChange?: (color: string | undefined) => void;
};

export default function SelectionPopup({
  selection,
  scale,
  onAction,
  onAddHighlight,
  onRemoveHighlight,
  selectedColorDefault,
  onSelectedColorChange,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showColorPopup, setShowColorPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(selectedColorDefault);
  const [showMainPopup, setShowMainPopup] = useState(true);

  // Tính toán kích thước popup dựa trên scale
  const popupWidth = Math.max(200, Math.min(320, 200 + (scale - 1) * 50));
  const fontSize = Math.max(12, Math.min(16, 12 + (scale - 1) * 2));
  const wordCount = selection.text.trim().split(/\s+/).filter(Boolean).length;
  const canSummarize = wordCount >= 50;

  const fire = (type: Parameters<typeof onAction>[0]) => {
    onAction(type, {
      text: selection.text,
      pageNumber: selection.pageNumber,
      rects: selection.rects,
    });
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    onSelectedColorChange?.(color);
    onAddHighlight(color);
  };

  const handleRemoveHighlight = () => {
    if (onRemoveHighlight) {
      onRemoveHighlight();
      setShowColorPopup(false);
      setSelectedColor(undefined);
      onSelectedColorChange?.(undefined);
      setShowMainPopup(true);
    }
  };

  if (!showMainPopup && !showColorPopup) {
    return null;
  }

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
      {showMainPopup && !showColorPopup && (
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
          {canSummarize ? (
            <button
              className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
              onClick={() => fire('summarize')}
            >
              <ListTree size={16} /> Summarize
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className='w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled
                >
                  <ListTree size={16} /> Summarize
                </button>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='max-w-xs'
              >
                <p>Select at least 50 words to summarize ({wordCount}/50)</p>
              </TooltipContent>
            </Tooltip>
          )}
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
            onClick={() => fire('related')}
          >
            <PanelRightOpen size={16} /> Get Related papers
          </button>
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left relative'
            onClick={() => {
              setShowColorPopup(true);
              setShowMainPopup(false);
            }}
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
      )}
      {showColorPopup && (
        <ColorPopup
          onSelectColor={handleSelectColor}
          onRemoveHighlight={handleRemoveHighlight}
          selectedColor={selectedColor}
        />
      )}
    </div>
  );
}
