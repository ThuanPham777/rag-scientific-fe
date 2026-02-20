import { useUiStore } from '@/store/useUiStore';
import NotebookPage from '@/pages/NotebookPage';
import { useRef, useState, useCallback, useEffect } from 'react';

const MIN_WIDTH = 480;
const MAX_WIDTH_RATIO = 0.9; // max 90% of viewport

export default function NotebookPanel() {
  const { isNotebooksOpen, closeNotebooks } = useUiStore();
  const [width, setWidth] = useState(820);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      setWidth(Math.max(MIN_WIDTH, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isNotebooksOpen) return null;

  return (
    <div
      ref={panelRef}
      className='fixed right-0 top-16 bottom-0 bg-white z-40 shadow-lg flex'
      style={{ width }}
    >
      {/* Drag handle on left edge */}
      <div
        onMouseDown={handleMouseDown}
        className='group w-1 cursor-col-resize flex-shrink-0 relative'
      >
        <div className='absolute inset-y-0 -left-1 w-3 group-hover:bg-blue-400/30 transition-colors' />
      </div>

      <div className='flex-1 flex flex-col min-w-0'>
        <div className='flex items-center justify-between px-4 py-2 border-b'>
          <div className='font-medium'>My Notebooks</div>
          <div>
            <button onClick={closeNotebooks} className='px-3 py-1 rounded hover:bg-gray-100'>Close</button>
          </div>
        </div>
        <div className='flex-1 overflow-auto'>
          <NotebookPage />
        </div>
      </div>
    </div>
  );
}
