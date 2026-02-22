import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, ExternalLink, Maximize2, AlertTriangle } from 'lucide-react';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';
import { useUiStore } from '@/store/useUiStore';

export default function NotebookPage() {
  const qc = useQueryClient();
  const { data: notebooks = [], refetch } = useQuery({ queryKey: ['notebooks'], queryFn: () => notebookService.list() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    // If there are notebooks, select the most recent. If none, auto-create one so UI isn't blank.
    if (notebooks.length && !selectedId) {
      setSelectedId(notebooks[0].id);
    }
    if (!notebooks.length && selectedId === null) {
      // auto-create a notebook on first visit for better UX
      createNew();
    }
  }, [notebooks, selectedId]);

  // Watch for pending notebook from PDF "Save to notebook"
  const pendingNotebookId = useUiStore((s) => s.pendingNotebookId);
  const setPendingNotebookId = useUiStore((s) => s.setPendingNotebookId);
  useEffect(() => {
    if (!pendingNotebookId) return;
    // Refetch notebooks list, select the pending notebook, and load its detail
    (async () => {
      await refetch();
      setSelectedId(pendingNotebookId);
      try {
        const d = await notebookService.get(pendingNotebookId);
        setDetail(d);
      } catch (err) {
        console.error('Failed to load pending notebook', err);
      }
      setPendingNotebookId(null);
    })();
  }, [pendingNotebookId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      const d = await notebookService.get(selectedId);
      setDetail(d);
    };
    load();
  }, [selectedId]);

  const createNew = async () => {
    const created = await notebookService.create({ title: 'Untitled' });
    qc.invalidateQueries({ queryKey: ['notebooks'] });
    setSelectedId(created.id);
    setDetail(created);
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await notebookService.remove(deleteTarget.id);
    await refetch();
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
  }, [deleteTarget, refetch, selectedId]);

  const handleUpdated = (updated: any) => {
    setDetail(updated);
    qc.invalidateQueries({ queryKey: ['notebooks'] });
  };

  return (
    <>
    <div className='flex h-full'>
      <div className='w-80 border-r bg-gray-50 overflow-auto'>
        <div className='flex items-center justify-start mb-4'>
          <button
            onClick={createNew}
            className='p-1.5 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-colors'
            title='Add new notebook'
          >
            <Plus size={18} />
          </button>
        </div>

        <div className='flex flex-col gap-2'>
          {notebooks.map((nb: any) => (
            <div
              key={nb.id}
              className={`p-3 rounded cursor-pointer flex items-start justify-between group ${selectedId === nb.id ? 'bg-white shadow' : 'hover:bg-white'}`}
              onClick={() => setSelectedId(nb.id)}
            >
              <div className='flex-1 min-w-0'>
                {editingId === nb.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={async () => {
                      if (editingTitle.trim()) {
                        await notebookService.update(nb.id, { title: editingTitle });
                        qc.invalidateQueries({ queryKey: ['notebooks'] });
                        setDetail({ ...detail, title: editingTitle });
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className='font-medium border rounded px-2 py-1 w-full'
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className='font-medium flex items-center gap-2'>
                    <span className='truncate'>{nb.title || 'Untitled'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(nb.id);
                        setEditingTitle(nb.title || 'Untitled');
                      }}
                      className='opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded flex-shrink-0'
                      title='Rename'
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <div className='text-xs text-gray-500 mt-1 truncate'>{nb.contentPreview}</div>
              </div>
              <div className='flex items-center gap-1'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/notebooks/${nb.id}`, '_blank');
                  }}
                  className='opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded flex-shrink-0'
                  title='Open in new tab'
                >
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(nb);
                  }}
                  className='opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 flex-shrink-0'
                  title='Delete'
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='flex-1 flex flex-col'>
        {selectedId && (
          <div className='flex justify-end px-3 py-1.5 border-b'>
            <button
              onClick={() => window.open(`/notebooks/${selectedId}`, '_blank')}
              className='p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'
              title='Open full screen'
            >
              <Maximize2 size={16} />
            </button>
          </div>
        )}
        <NotebookEditor notebook={detail} onUpdated={handleUpdated} />
      </div>
    </div>

      {/* Custom delete confirmation modal */}
      {deleteTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setDeleteTarget(null)}>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
          <div
            className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6'
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
