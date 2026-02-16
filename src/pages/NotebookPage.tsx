import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';

export default function NotebookPage() {
  const qc = useQueryClient();
  const { data: notebooks = [], refetch } = useQuery({ queryKey: ['notebooks'], queryFn: () => notebookService.list() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

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

  const remove = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await notebookService.remove(id);
    await refetch();
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdated = (updated: any) => {
    setDetail(updated);
    qc.invalidateQueries({ queryKey: ['notebooks'] });
  };

  return (
    <div className='flex h-full'>
      <div className='w-80 border-r bg-gray-50 overflow-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold'>My Notebooks</h3>
          <button
            onClick={createNew}
            className='text-sm px-2 py-1 bg-black text-white rounded hover:bg-gray-800'
            title='Add new notebook'
          >
            <Plus size={16} />
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
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(nb.id);
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
        <NotebookEditor notebook={detail} onUpdated={handleUpdated} />
      </div>
    </div>
  );
}
