import { useEffect, useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import notebookService from '@/services/notebookService';

export default function NotebookListTable() {
  const qc = useQueryClient();
  const { data: notebooks = [], isLoading, refetch } = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.list(),
  });

  useEffect(() => {
    // refresh when coming back
    refetch();
  }, []);

  const createNew = async () => {
    const created = await notebookService.create({ title: 'Untitled' });
    qc.invalidateQueries({ queryKey: ['notebooks'] });
    window.open(`/notebooks/${created.id}`, '_blank');
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const handleRenameStart = (e: React.MouseEvent, nb: any) => {
    e.stopPropagation();
    setEditingId(nb.id);
    setEditingTitle(nb.title || 'Untitled');
  };

  const handleRenameCommit = async (nb: any) => {
    const trimmed = editingTitle.trim();
    setEditingId(null);
    if (!trimmed || trimmed === (nb.title || '')) return;
    try {
      await notebookService.update(nb.id, { title: trimmed, content: nb.content || '' });
      qc.invalidateQueries({ queryKey: ['notebooks'] });
    } catch (err) {
      console.error('Failed to rename notebook', err);
      window.alert('Failed to rename notebook');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, nb: any) => {
    e.stopPropagation();
    setDeleteTarget(nb);
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await notebookService.remove(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['notebooks'] });
    } catch (err) {
      console.error('Failed to delete notebook', err);
    }
    setDeleteTarget(null);
  }, [deleteTarget, qc]);

  return (
    <>
    <div className='p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold'>Notebooks</h3>
        <button
          onClick={createNew}
          className='px-3 py-1 bg-black text-white rounded flex items-center gap-2'
        >
          <Plus size={14} /> New
        </button>
      </div>

      <div className='bg-white border rounded-md overflow-hidden'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='text-left px-4 py-3'>Name</th>
              <th className='text-left px-4 py-3'>Preview</th>
              <th className='text-left px-4 py-3'>Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className='p-6 text-center text-gray-500'>
                  Loading...
                </td>
              </tr>
            ) : notebooks.length === 0 ? (
              <tr>
                <td colSpan={3} className='p-6 text-center text-gray-500'>
                  No notebooks yet
                </td>
              </tr>
            ) : (
              notebooks.map((nb: any) => (
                <tr
                  key={nb.id}
                  className='hover:bg-gray-50 cursor-pointer'
                  onClick={() => window.open(`/notebooks/${nb.id}`, '_blank')}
                >
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='truncate max-w-[14rem]'>
                        {editingId === nb.id ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={async () => await handleRenameCommit(nb)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className='font-medium border rounded px-2 py-1 w-full'
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className='flex items-center gap-2'>
                            <span className='truncate'>{nb.title || 'Untitled'}</span>
                          </div>
                        )}
                      </div>
                      <div className='flex items-center gap-1'>
                        <button
                          onClick={(e) => handleRenameStart(e, nb)}
                          className='p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'
                          title='Rename'
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, nb)}
                          className='p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors'
                          title='Delete'
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-gray-600 truncate max-w-xl'>{nb.contentPreview || ''}</td>
                  <td className='px-4 py-3 text-gray-500'>{new Date(nb.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Custom delete confirmation modal */}
      {deleteTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setDeleteTarget(null)}>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
          <div
            className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start gap-4'>
              <div className='p-2 bg-red-100 rounded-full flex-shrink-0'>
                <AlertTriangle size={22} className='text-red-600' />
              </div>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-gray-900'>Delete Notebook</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Are you sure you want to delete <span className='font-medium text-gray-900'>"{deleteTarget.title || 'Untitled'}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setDeleteTarget(null)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
