import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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

  const handleDelete = async (e: React.MouseEvent, nb: any) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${nb.title || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await notebookService.remove(nb.id);
      qc.invalidateQueries({ queryKey: ['notebooks'] });
    } catch (err) {
      console.error('Failed to delete notebook', err);
      window.alert('Failed to delete notebook');
    }
  };

  return (
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
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={(e) => handleRenameStart(e, nb)}
                          className='text-sm text-blue-600 hover:underline px-2 py-1 rounded'
                        >
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, nb)}
                          className='text-sm text-red-600 hover:underline px-2 py-1 rounded'
                        >
                          Delete
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
  );
}
