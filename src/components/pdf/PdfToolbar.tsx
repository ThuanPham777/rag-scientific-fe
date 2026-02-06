import { useRef, useState, useEffect } from 'react';
import {
  Search,
  ZoomOut,
  ZoomIn,
  Maximize,
  Minimize,
  EllipsisVertical,
  Sigma,
  RotateCw,
  RotateCcw,
  Download,
  ChevronUp,
  ChevronDown,
  Menu,
  ArrowDown,
  ArrowUp,
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
  hitIndex: number;
  totalMatches: number;
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
  // Fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  // Rotation
  onRotateCw: () => void;
  onRotateCcw: () => void;
  // Download
  onDownload: () => void;
  fileUrl?: string;
  // Page navigation
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
  onToggleThumbnails?: () => void;
  showThumbnails?: boolean;
};

export default function PdfToolbar({
  showSearch,
  onToggleSearch,
  query,
  onQueryChange,
  hitIndex,
  totalMatches,
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
  isFullscreen,
  onToggleFullscreen,
  onRotateCw,
  onRotateCcw,
  onDownload,
  fileUrl,
  currentPage,
  numPages,
  onPageChange,
  onToggleThumbnails,
  showThumbnails,
}: Props) {
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const moreOptionsRef = useRef<HTMLDivElement>(null);
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [pageInputValue, setPageInputValue] = useState(String(currentPage));

  // Sync page input when currentPage changes
  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInputValue, 10);
      if (!isNaN(page) && page >= 1 && page <= numPages) {
        onPageChange(page);
      } else {
        setPageInputValue(String(currentPage));
      }
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      onPageChange(page);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        zoomDropdownRef.current &&
        !zoomDropdownRef.current.contains(event.target as Node)
      ) {
        setShowZoomDropdown(false);
      }
      if (
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(event.target as Node)
      ) {
        setShowMoreOptions(false);
      }
    };

    if (showZoomDropdown || showMoreOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showZoomDropdown, showMoreOptions]);

  return (
    <div className='relative px-3 py-2 flex items-center gap-2 border-b border-gray-200 bg-gray-400/10 rounded-md flex-shrink-0'>
      {isFullscreen && (
        <>
          {/* Thumbnails toggle button */}
          {onToggleThumbnails && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showThumbnails ? 'default' : 'ghost'}
                  size='icon-sm'
                  onClick={onToggleThumbnails}
                  className={
                    showThumbnails
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : ''
                  }
                >
                  <Menu size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <p>{showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Page navigation */}
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronUp size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <p>Previous page</p>
              </TooltipContent>
            </Tooltip>

            <div className='flex items-center gap-1 text-sm'>
              <Input
                type='text'
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputBlur}
                className='w-12 h-7 text-center px-1'
              />
              <span className='text-muted-foreground'>/ {numPages}</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() =>
                    onPageChange(Math.min(numPages, currentPage + 1))
                  }
                  disabled={currentPage >= numPages}
                >
                  <ChevronDown size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                <p>Next page</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </>
      )}

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
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>
            <p>
              {isFullscreen
                ? 'Exit Fullscreen (or press Esc)'
                : 'Enter Fullscreen'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* More Options Menu */}
        <div
          className='relative'
          ref={moreOptionsRef}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={() => setShowMoreOptions(!showMoreOptions)}
              >
                <EllipsisVertical size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>
              <p>More Options</p>
            </TooltipContent>
          </Tooltip>
          {showMoreOptions && (
            <div className='absolute right-0 mt-1 bg-white border rounded-md shadow w-48 py-2 z-20'>
              <Button
                variant='ghost'
                className='w-full justify-start h-auto py-2 px-3 gap-2'
                onClick={() => {
                  onRotateCw();
                }}
              >
                <RotateCw size={16} />
                Rotate clockwise
              </Button>
              <Button
                variant='ghost'
                className='w-full justify-start h-auto py-2 px-3 gap-2'
                onClick={() => {
                  onRotateCcw();
                }}
              >
                <RotateCcw size={16} />
                Rotate counterclockwise
              </Button>
              <div className='border-t my-1' />
              <Button
                variant='ghost'
                className='w-full justify-start h-auto py-2 px-3 gap-2'
                onClick={() => {
                  onDownload();
                }}
                disabled={!fileUrl}
              >
                <Download size={16} />
                Download PDF
              </Button>
            </div>
          )}
        </div>
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
            <div className='text-xs text-muted-foreground w-12 text-right whitespace-nowrap'>
              {totalMatches > 0 ? `${hitIndex + 1}/${totalMatches}` : `0/0`}
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
                disabled={totalMatches === 0}
              >
                <ArrowUp />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onGotoHit(1)}
                disabled={totalMatches === 0}
              >
                <ArrowDown />
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
