import { useUiStore } from '@/store/useUiStore';
import NotebookPage from '@/pages/NotebookPage';

export default function NotebookPanel() {
  const { isNotebooksOpen, closeNotebooks } = useUiStore();

  if (!isNotebooksOpen) return null;

  return (
    <div className='fixed right-0 top-16 bottom-0 w-[820px] bg-white border-l z-40 shadow-lg'>
      <div className='flex items-center justify-between px-4 py-2 border-b'>
        <div className='font-medium'>My Notebooks</div>
        <div>
          <button onClick={closeNotebooks} className='px-3 py-1 rounded hover:bg-gray-100'>Close</button>
        </div>
      </div>
      <div className='h-[calc(100vh-4rem)] overflow-auto'>
        <NotebookPage />
      </div>
    </div>
  );
}
