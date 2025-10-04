import { useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';

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
    <div className='relative px-3 py-2 flex items-center gap-2 border-b border-gray-200 bg-white flex-shrink-0'>
      {/* Search button */}
      <button
        ref={searchBtnRef}
        className='w-9 h-9 grid place-items-center rounded-md border'
        onClick={onToggleSearch}
        title='Search in PDF'
      >
        <Search size={16} />
      </button>

      {/* Explain math & table */}
      <button
        className={`h-9 px-4 rounded-md border text-sm ${
          captureMode
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-white hover:bg-gray-50'
        }`}
        onClick={onToggleCapture}
      >
        <span className='mr-1'>∑</span> Explain math &amp; table
      </button>

      <div className='ml-auto flex items-center gap-1 text-sm'>
        <button
          className='w-9 h-9 rounded-md border hover:bg-gray-50'
          onClick={zoomOut}
          title='Zoom out'
        >
          -
        </button>
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
        <button
          className='w-9 h-9 rounded-md border hover:bg-gray-50'
          onClick={zoomIn}
          title='Zoom in'
        >
          +
        </button>
        <button
          className='w-9 h-9 rounded-md border hover:bg-gray-50'
          title='Fit to width'
        >
          ⤢
        </button>
        <button
          className='w-9 h-9 rounded-md border hover:bg-gray-50'
          title='More options'
        >
          ⋮
        </button>
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
