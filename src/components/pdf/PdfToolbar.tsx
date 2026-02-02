import { useRef, useState, useEffect } from 'react';
import {
  Search,
  ZoomOut,
  ZoomIn,
  Maximize,
  EllipsisVertical,
  Sigma,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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
      <Button
        ref={searchBtnRef}
        variant='outline'
        size='icon'
        onClick={onToggleSearch}
      >
        <Search size={16} />
      </Button>

      {/* Explain math & table */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={captureMode ? 'default' : 'outline'}
            size='default'
            className={
              captureMode ? 'bg-orange-500 text-white hover:bg-orange-600' : ''
            }
            onClick={onToggleCapture}
          >
            <Sigma
              size={16}
              className='text-purple-600 mr-1'
            />
            Explain math &amp; table
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side='top'
          className='max-w-xs'
        >
          <p>
            Select and drag the cursor over an area containing formulas,
            equations or tables
          </p>
        </TooltipContent>
      </Tooltip>

      <div className='ml-auto flex items-center gap-1 text-sm'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={zoomOut}
            >
              <ZoomOut size={22} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            <p>Zoom Out</p>
          </TooltipContent>
        </Tooltip>

        {/* Dropdown % giống ảnh */}
        <div
          className='relative'
          ref={zoomDropdownRef}
        >
          <Button
            variant='outline'
            size='default'
            className='w-[76px]'
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
          >
            {Math.round(scale * 100)}%
          </Button>
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
                <Button
                  key={opt.label}
                  variant='ghost'
                  className='w-full justify-start h-auto py-1.5 px-3'
                  onClick={() => {
                    if (typeof opt.scale === 'number') {
                      setScale(opt.scale);
                    }
                    // TODO: Handle "Page fit" and "Page width" cases
                    setShowZoomDropdown(false);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={zoomIn}
            >
              <ZoomIn size={22} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            <p>Zoom In</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon-sm'
            >
              <Maximize size={22} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            <p>Enter Fullscreen</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon-sm'
            >
              <EllipsisVertical size={22} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            <p>More Options</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Search popover */}
      {showSearch && (
        <div className='absolute left-2 top-full mt-2 w-72 rounded-md border bg-white shadow p-2 z-20'>
          <div className='flex items-center gap-2'>
            <Input
              className='flex-1 h-9'
              placeholder='Enter to search'
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRunSearch()}
              autoFocus
            />
            <div className='text-xs text-muted-foreground w-10 text-right'>
              {hits.length ? `${hitIndex + 1}/${totalHits}` : `0/0`}
            </div>
          </div>

          <div className='mt-2 space-y-2'>
            <label className='flex items-center gap-2 text-sm cursor-pointer'>
              <Checkbox
                checked={matchCase}
                onCheckedChange={(checked) =>
                  onMatchCaseChange(checked === true)
                }
              />
              <span>Match case</span>
            </label>
            <label className='flex items-center gap-2 text-sm cursor-pointer'>
              <Checkbox
                checked={wholeWords}
                onCheckedChange={(checked) =>
                  onWholeWordsChange(checked === true)
                }
              />
              <span>Whole words</span>
            </label>
          </div>

          <div className='mt-2 flex items-center justify-between'>
            <div className='flex gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onGotoHit(-1)}
              >
                ↑
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onGotoHit(1)}
              >
                ↓
              </Button>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={onToggleSearch}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
