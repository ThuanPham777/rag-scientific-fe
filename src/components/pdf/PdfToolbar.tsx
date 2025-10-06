import { useRef, useState, useEffect } from 'react';
import {
  Search,
  ZoomOut,
  ZoomIn,
  Maximize,
  EllipsisVertical,
  Sigma,
} from 'lucide-react';
import ATooltip from '../ui/tooltip/ATooltip';

type Props = {
  showSearch: boolean;
  onToggleSearch: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  hits: { pageNumber: number; rects: any[] }[];
  hitIndex: number;
  onGotoHit: (dir: 1 | -1) => void;
  onRunSearch: () => void;
  matchCase: boolean;
  onMatchCaseChange: (value: boolean) => void;
  wholeWords: boolean;
  onWholeWordsChange: (value: boolean) => void;
  onToggleCapture: () => void;
  captureMode: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  scale: number;
  setScale: (scale: number) => void;
};

export default function PdfToolbar({
  showSearch,
  onToggleSearch,
  query,
  onQueryChange,
  hits,
  hitIndex,
  onGotoHit,
  onRunSearch,
  matchCase,
  onMatchCaseChange,
  wholeWords,
  onWholeWordsChange,
  onToggleCapture,
  captureMode,
  zoomIn,
  zoomOut,
  scale,
  setScale,
}: Props) {
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const totalHits = hits.reduce((s, h) => s + h.rects.length, 0);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        zoomDropdownRef.current &&
        !zoomDropdownRef.current.contains(event.target as Node)
      ) {
        setShowZoomDropdown(false);
      }
    };

    if (showZoomDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showZoomDropdown]);

  return (
    <div className='relative px-3 py-2 flex items-center gap-2 border-b border-gray-200 bg-gray-400/10 rounded-md flex-shrink-0'>
      {/* Search button */}
      <button
        ref={searchBtnRef}
        className='w-9 h-9 grid place-items-center rounded-md border cursor-pointer hover:bg-gray-50'
        onClick={onToggleSearch}
      >
        <Search size={16} />
      </button>

      {/* Explain math & table */}
      <ATooltip
        placement='top'
        title='Select and drag the cursor over an area containing formulas, equations or tables'
      >
        <button
          className={`h-9 px-4 rounded-md border text-sm ${
            captureMode
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-400/10 hover:bg-gray-400/20 text-gray-700'
          }`}
          onClick={onToggleCapture}
        >
          <p className='flex items-center gap-1'>
            <span className='mr-1'>
              <Sigma
                size={16}
                className='text-purple-600'
              />
            </span>{' '}
            <span>Explain math &amp; table</span>
          </p>
        </button>
      </ATooltip>

      <div className='ml-auto flex items-center gap-1 text-sm'>
        <ATooltip
          placement='top'
          title='Zoom Out'
        >
          <button
            type='button'
            className='w-8 h-8 rounded-md hover:bg-gray-200 grid place-items-center'
            onClick={zoomOut}
          >
            <ZoomOut size={22} />
          </button>
        </ATooltip>

        {/* Dropdown % giống ảnh */}
        <div
          className='relative'
          ref={zoomDropdownRef}
        >
          <button
            className='w-[76px] h-9 rounded-md border grid place-items-center select-none hover:bg-gray-50'
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
          >
            {Math.round(scale * 100)}%
          </button>
          {showZoomDropdown && (
            <div className='absolute right-0 mt-1 bg-white border rounded-md shadow w-40 py-2 z-10'>
              {[
                { label: 'Actual size', scale: 1 },
                { label: 'Page fit', scale: 'fit' },
                { label: 'Page width', scale: 'width' },
                { label: '50%', scale: 0.5 },
                { label: '75%', scale: 0.75 },
                { label: '100%', scale: 1 },
                { label: '125%', scale: 1.25 },
                { label: '150%', scale: 1.5 },
                { label: '200%', scale: 2 },
                { label: '300%', scale: 3 },
                { label: '400%', scale: 4 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  className='block w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm'
                  onClick={() => {
                    if (typeof opt.scale === 'number') {
                      setScale(opt.scale);
                    }
                    // TODO: Handle "Page fit" and "Page width" cases
                    setShowZoomDropdown(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <ATooltip
          placement='top'
          title='Zoom In'
        >
          <button
            type='button'
            className='w-8 h-8 rounded-md hover:bg-gray-200 grid place-items-center'
            onClick={zoomIn}
          >
            <ZoomIn size={22} />
          </button>
        </ATooltip>

        <ATooltip
          placement='top'
          title='Enter Fullscreen'
        >
          <button
            type='button'
            className='w-8 h-8 rounded-md hover:bg-gray-200 grid place-items-center'
          >
            <Maximize size={22} />
          </button>
        </ATooltip>

        <ATooltip
          placement='top'
          title='More Options'
        >
          <button
            type='button'
            className='w-8 h-8 rounded-md hover:bg-gray-200 grid place-items-center'
          >
            <EllipsisVertical size={22} />
          </button>
        </ATooltip>
      </div>

      {/* Search popover */}
      {showSearch && (
        <div className='absolute left-2 top-full mt-2 w-72 rounded-md border bg-white shadow p-2 z-20'>
          <div className='flex items-center gap-2'>
            <input
              className='flex-1 h-9 px-3 rounded-md border text-sm'
              placeholder='Enter to search'
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRunSearch()}
              autoFocus
            />
            <div className='text-xs text-gray-500 w-10 text-right'>
              {hits.length ? `${hitIndex + 1}/${totalHits}` : `0/0`}
            </div>
          </div>

          <label className='mt-2 flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={matchCase}
              onChange={(e) => onMatchCaseChange(e.target.checked)}
            />
            Match case
          </label>
          <label className='mt-1 flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={wholeWords}
              onChange={(e) => onWholeWordsChange(e.target.checked)}
            />
            Whole words
          </label>

          <div className='mt-2 flex items-center justify-between'>
            <div className='flex gap-1'>
              <button
                className='px-2 h-8 rounded border text-sm'
                onClick={() => onGotoHit(-1)}
              >
                ↑
              </button>
              <button
                className='px-2 h-8 rounded border text-sm'
                onClick={() => onGotoHit(1)}
              >
                ↓
              </button>
            </div>
            <button
              className='px-3 h-8 rounded border text-sm'
              onClick={onToggleSearch}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
