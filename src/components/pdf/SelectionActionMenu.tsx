import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import HighlightEditor from './HighlightEditor';
import { useAuthStore } from '@/store/useAuthStore';

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
      comment?: string;
    },
  ) => void;
  onAddHighlight: (
    color?: string,
    comment?: string,
    shouldClose?: boolean,
  ) => void;
  onRemoveHighlight?: () => void;
  onFinalizeHighlight?: () => void; // Called when user clicks Save to close editor
  selectedColorDefault?: string;
  onSelectedColorChange?: (color: string | undefined) => void;
  onSaveComment?: (comment: string) => void;
  pageRef?: HTMLDivElement | null;
};

export default function SelectionActionMenu({
  selection,
  scale,
  onAction,
  onAddHighlight,
  onRemoveHighlight,
  onFinalizeHighlight,
  selectedColorDefault,
  onSelectedColorChange,
  onSaveComment,
  pageRef,
}: Props) {
  const { isAuthenticated } = useAuthStore();
  const popupRef = useRef<HTMLDivElement>(null);
  const [showColorPopup, setShowColorPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    selectedColorDefault,
  );
  const [showMainPopup, setShowMainPopup] = useState(true);
  const [currentComment, setCurrentComment] = useState('');
  const [fixedPosition, setFixedPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Calculate fixed position for portal
  useEffect(() => {
    if (pageRef) {
      const pageRect = pageRef.getBoundingClientRect();
      setFixedPosition({
        top: pageRect.top + selection.anchor.y,
        left: pageRect.left + selection.anchor.x,
      });
    }
  }, [pageRef, selection.anchor.x, selection.anchor.y]);

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

  const handleSelectColor = useCallback(
    (color: string) => {
      setSelectedColor(color);
      onSelectedColorChange?.(color);
      // Update the highlight color but keep editor open
      onAddHighlight(color, currentComment, false);
    },
    [onSelectedColorChange, onAddHighlight, currentComment],
  );

  const handleRemoveHighlight = useCallback(() => {
    if (onRemoveHighlight) {
      onRemoveHighlight();
      setShowColorPopup(false);
      setSelectedColor(undefined);
      onSelectedColorChange?.(undefined);
      setShowMainPopup(true);
      setCurrentComment('');
    }
  }, [onRemoveHighlight, onSelectedColorChange]);

  const handleSaveComment = useCallback(
    (comment: string) => {
      setCurrentComment(comment);
      onSaveComment?.(comment);
      if (selectedColor) {
        // Save final highlight with comment and close editor
        onAddHighlight(selectedColor, comment, true);
      }
      // Finalize and close
      onFinalizeHighlight?.();
    },
    [onSaveComment, selectedColor, onAddHighlight, onFinalizeHighlight],
  );

  if (!showMainPopup && !showColorPopup) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Use portal for proper layering above PDF viewer
  const popupContent = (
    <div
      ref={popupRef}
      className='fixed'
      style={{
        left: fixedPosition?.left ?? selection.anchor.x,
        top: fixedPosition?.top ?? selection.anchor.y,
        width: `${popupWidth}px`,
        zIndex: 99999,
      }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      data-selection-popup='true'
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
                className='max-w-xs z-[99999]'
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
              // Immediately create highlight with default color, keep editor open
              const defaultColor = selectedColorDefault || '#ffd700';
              setSelectedColor(defaultColor);
              setShowColorPopup(true);
              setShowMainPopup(false);
              // Create the highlight immediately but don't close the selection
              onAddHighlight(defaultColor, undefined, false);
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
      {isAuthenticated && showColorPopup && (
        <HighlightEditor
          onSelectColor={handleSelectColor}
          onRemoveHighlight={handleRemoveHighlight}
          selectedColor={selectedColor}
          onSaveComment={handleSaveComment}
          initialComment={currentComment}
          position={fixedPosition ?? undefined}
          usePortal={false}
        />
      )}
    </div>
  );

  // Render via portal to escape overflow clipping
  return createPortal(popupContent, document.body);
}
