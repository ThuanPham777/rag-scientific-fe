import { Ban, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type ColorPopupProps = {
  onSelectColor: (color: string) => void;
  onRemoveHighlight?: () => void;
  selectedColor?: string;
  onSaveComment?: (comment: string) => void;
  initialComment?: string;
  position?: { top: number; left: number };
  usePortal?: boolean;
};

// Must match backend HighlightColor enum: YELLOW, GREEN, BLUE, PINK, ORANGE
const HIGHLIGHT_COLORS = [
  '#ffd700',
  '#90ee90',
  '#87ceeb',
  '#ffb6c1',
  '#ffa500',
];

export default function HighlightEditor({
  onSelectColor,
  onRemoveHighlight,
  selectedColor,
  onSaveComment,
  initialComment = '',
  position,
  usePortal = false,
}: ColorPopupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState(initialComment);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(true);
  };

  const handleSave = () => {
    onSaveComment?.(comment);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const stopAllPropagation = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e && e.type === 'mousedown') {
      // Don't prevent default for focus-related events
    }
  };

  const content = (
    <div
      ref={containerRef}
      className='bg-neutral-900 text-white rounded-lg shadow-xl border border-neutral-700 p-3 flex flex-col gap-3 backdrop-blur-sm'
      style={{
        minWidth: isExpanded ? '220px' : '200px',
        ...(position
          ? {
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 99999,
            }
          : {
              position: 'absolute',
              zIndex: 99999,
            }),
      }}
      onClick={stopAllPropagation}
      onMouseDown={stopAllPropagation}
      onMouseUp={stopAllPropagation}
      onFocus={stopAllPropagation}
      data-color-popup='true'
    >
      {/* COLOR PICKER */}
      <div className='flex gap-3 items-center'>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            className='w-6 h-6 rounded-full relative transition-all hover:scale-110 flex-shrink-0'
            style={{ backgroundColor: color }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(color);
            }}
          >
            {selectedColor === color && (
              <span className='absolute inset-0 flex items-center justify-center'>
                <Check
                  size={12}
                  className='text-black'
                />
              </span>
            )}
          </button>
        ))}

        {/* REMOVE */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className='w-6 h-6 rounded-full border border-neutral-600 flex items-center justify-center hover:bg-neutral-700 transition flex-shrink-0'
              onClick={(e) => {
                e.stopPropagation();
                onRemoveHighlight?.();
              }}
            >
              <Ban
                size={14}
                className='text-white'
              />
            </button>
          </TooltipTrigger>

          <TooltipContent side='top'>Remove highlight</TooltipContent>
        </Tooltip>
      </div>

      {/* COMMENT INPUT - Compact mode */}
      {!isExpanded && (
        <div
          onClick={stopAllPropagation}
          onMouseDown={stopAllPropagation}
        >
          <input
            ref={inputRef}
            type='text'
            placeholder='Add a comment...'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onClick={handleInputClick}
            onFocus={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            className='w-full bg-neutral-800 border border-neutral-700 text-sm rounded-md px-3 py-2 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
          />
        </div>
      )}

      {/* COMMENT TEXTAREA - Expanded mode */}
      {isExpanded && (
        <div
          className='flex flex-col gap-2'
          onClick={stopAllPropagation}
          onMouseDown={stopAllPropagation}
        >
          <textarea
            ref={textareaRef}
            placeholder='Add a comment...'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            rows={3}
            className='w-full bg-neutral-800 border border-neutral-700 text-sm rounded-md px-3 py-2 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none'
          />
          <div className='flex justify-end'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className='bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-md transition'
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (usePortal) {
    return createPortal(content, document.body);
  }

  return content;
}
