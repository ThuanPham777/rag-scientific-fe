import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, ExternalLink, Maximize2, AlertTriangle, Users, ChevronDown, ChevronRight, EyeOff, Share2 } from 'lucide-react';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';
import { useUiStore } from '@/store/useUiStore';

export default function NotebookPage() {
  const qc = useQueryClient();
  const { data: myNotebooks = [], refetch: refetchMy, isFetched: myFetched } = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.list(),
  });
  const { data: sharedNotebooks = [], refetch: refetchShared, isFetched: sharedFetched } = useQuery({
    queryKey: ['notebooks-shared'],
    queryFn: () => notebookService.listSharedWithMe(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletedNotebookMsg, setDeletedNotebookMsg] = useState<string | null>(null);

  // Section collapse state
  const [myOpen, setMyOpen] = useState(true);
  const [mySharedOpen, setMySharedOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(true);

  // Split owned notebooks: regular vs collaborative (shared copies)
  const regularNotebooks = myNotebooks.filter((nb: any) => !nb.isCollaborative);
  const mySharedNotebooks = myNotebooks.filter((nb: any) => nb.isCollaborative);

  useEffect(() => {
    if (myNotebooks.length && !selectedId) {
      setSelectedId(myNotebooks[0].id);
    }
    // Only auto-create if both queries have finished loading and there are truly no notebooks
    if (myFetched && sharedFetched && !myNotebooks.length && !sharedNotebooks.length && selectedId === null) {
      createNew();
    }
  }, [myNotebooks, sharedNotebooks, selectedId, myFetched, sharedFetched]);

  // Watch for pending notebook from PDF "Save to notebook"
  const pendingNotebookId = useUiStore((s) => s.pendingNotebookId);
  const setPendingNotebookId = useUiStore((s) => s.setPendingNotebookId);
  useEffect(() => {
    if (!pendingNotebookId) return;
    (async () => {
      await refetchMy();
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
      if (!selectedId) { setDetail(null); return; }
      setDeletedNotebookMsg(null);
      try {
        const d = await notebookService.get(selectedId);
        setDetail(d);
      } catch {
        // may be a shared notebook — try collaborative endpoint
        try {
          const d = await notebookService.getCollaborative(selectedId);
          setDetail(d);
        } catch (err: any) {
          console.error('Failed to load notebook', err);
          // 404/403 → notebook was deleted or access revoked
          setDetail(null);
          setSelectedId(null);
          setDeletedNotebookMsg('Notebook này không còn tồn tại hoặc bạn không còn quyền truy cập.');
        }
      }
    };
    load();
  }, [selectedId]);

  const createNew = async () => {
    // Generate a unique "Untitled" name
    const baseName = 'Untitled';
    let newTitle = baseName;
    let counter = 1;
    const allTitles = myNotebooks.map((nb: any) => nb.title);
    while (allTitles.includes(newTitle)) {
      newTitle = `${baseName} (${counter})`;
      counter++;
    }
    const created = await notebookService.create({ title: newTitle });
    qc.invalidateQueries({ queryKey: ['notebooks'] });
    setSelectedId(created.id);
    setDetail(created);
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await notebookService.remove(deleteTarget.id);
    await refetchMy();
    await refetchShared();
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
  }, [deleteTarget, refetchMy, refetchShared, selectedId]);

  const handleUpdated = (_updated: any) => {
    // Don't call setDetail here — the editor is the source of truth.
    // Feeding auto-save responses back causes content jumping and race conditions.
    qc.invalidateQueries({ queryKey: ['notebooks'] });
  };

  const renderNotebookItem = (nb: any) => {
    const isSelected = selectedId === nb.id;
    const isShared = !!nb.isSharedWithMe;

    return (
      <div
        key={nb.id}
        className={`p-3 rounded cursor-pointer flex items-start justify-between group ${isSelected ? 'bg-white shadow' : 'hover:bg-white'}`}
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
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className='font-medium border rounded px-2 py-1 w-full'
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className='font-medium flex items-center gap-2'>
              <span className='truncate'>{nb.title || 'Untitled'}</span>
              {!isShared && (
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
              )}
            </div>
          )}
          {isShared && nb.ownerName && (
            <div className='text-xs text-indigo-500 mt-0.5 flex items-center gap-1'>
              <Users size={10} />
              <span className='truncate'>by {nb.ownerName}</span>
            </div>
          )}
          <div className='text-xs text-gray-500 mt-1 truncate'>{nb.contentPreview}</div>
        </div>
        <div className='flex items-center gap-1'>
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`/notebooks/${nb.id}`, '_blank'); }}
            className='opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded flex-shrink-0'
            title='Open in new tab'
          >
            <ExternalLink size={14} />
          </button>
          {isShared ? (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ ...nb, isShared: true }); }}
              className='opacity-0 group-hover:opacity-100 p-1 hover:bg-orange-100 rounded text-orange-500 flex-shrink-0'
              title='Remove from list'
            >
              <EyeOff size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(nb); }}
              className='opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 flex-shrink-0'
              title='Delete'
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className='flex h-full'>
      {/* Sidebar */}
      <div className='w-80 border-r bg-gray-50 overflow-auto'>
        {/* New notebook button */}
        <div className='flex items-center justify-start px-3 pt-3 mb-2'>
          <button
            onClick={createNew}
            className='p-1.5 rounded-full text-gray-500 hover:text-black hover:bg-gray-200 transition-colors'
            title='Add new notebook'
          >
            <Plus size={18} />
          </button>
        </div>

        {/* ── My Notebooks ── */}
        <div className='mb-1'>
          <button
            onClick={() => setMyOpen((v) => !v)}
            className='w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors'
          >
            {myOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            My Notebooks
            <span className='ml-auto text-gray-400 font-normal normal-case tracking-normal'>{regularNotebooks.length}</span>
          </button>
          {myOpen && (
            <div className='flex flex-col gap-1 px-2'>
              {regularNotebooks.length === 0 && (
                <div className='text-xs text-gray-400 px-2 py-2'>No notebooks yet</div>
              )}
              {regularNotebooks.map((nb: any) => renderNotebookItem(nb))}
            </div>
          )}
        </div>

        {/* ── My Shared (collaborative copies I own) ── */}
        {mySharedNotebooks.length > 0 && (
          <div className='mb-1'>
            <button
              onClick={() => setMySharedOpen((v) => !v)}
              className='w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-500 uppercase tracking-wide hover:text-violet-700 transition-colors'
            >
              {mySharedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Share2 size={11} />
              My Shared
              <span className='ml-auto text-violet-300 font-normal normal-case tracking-normal'>{mySharedNotebooks.length}</span>
            </button>
            {mySharedOpen && (
              <div className='flex flex-col gap-1 px-2'>
                {mySharedNotebooks.map((nb: any) => renderNotebookItem(nb))}
              </div>
            )}
          </div>
        )}

        {/* ── Shared with me ── */}
        {sharedNotebooks.length > 0 && (
          <div className='mt-2'>
            <button
              onClick={() => setSharedOpen((v) => !v)}
              className='w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-500 uppercase tracking-wide hover:text-indigo-700 transition-colors'
            >
              {sharedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Users size={12} />
              Shared with me
              <span className='ml-auto text-indigo-300 font-normal normal-case tracking-normal'>{sharedNotebooks.length}</span>
            </button>
            {sharedOpen && (
              <div className='flex flex-col gap-1 px-2'>
                {sharedNotebooks.map((nb: any) => renderNotebookItem({ ...nb, isSharedWithMe: true }))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className='flex-1 flex flex-col'>
        {selectedId && !deletedNotebookMsg && (
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
        {deletedNotebookMsg ? (
          <div className='flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50'>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4'>
              <AlertTriangle className='text-red-500' size={32} />
            </div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Không thể tải Notebook</h3>
            <p className='text-gray-500 max-w-sm'>{deletedNotebookMsg}</p>
          </div>
        ) : detail ? (
          <NotebookEditor key={detail.id} notebook={detail} onUpdated={handleUpdated} />
        ) : (
          <div className='flex items-center justify-center h-full text-gray-400'>
            Select a notebook to view and edit
          </div>
        )}
      </div>
    </div>

    {/* Delete / Remove confirmation modal */}
    {deleteTarget && (
      <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setDeleteTarget(null)}>
        <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
        <div
          className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-start gap-4'>
            <div className={`p-2 rounded-full flex-shrink-0 ${deleteTarget.isShared ? 'bg-orange-100' : 'bg-red-100'}`}>
              {deleteTarget.isShared ? (
                <EyeOff size={22} className='text-orange-500' />
              ) : (
                <AlertTriangle size={22} className='text-red-600' />
              )}
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {deleteTarget.isShared ? 'Remove shared notebook' : 'Delete Notebook'}
              </h3>
              <p className='mt-2 text-sm text-gray-600'>
                {deleteTarget.isShared
                  ? <>Remove <span className='font-medium text-gray-900'>"{deleteTarget.title || 'Untitled'}"</span> from your shared list? The notebook will still exist for the owner.</>
                  : <>Are you sure you want to delete <span className='font-medium text-gray-900'>"{deleteTarget.title || 'Untitled'}"</span>? This action cannot be undone.</>
                }
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
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${deleteTarget.isShared ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {deleteTarget.isShared ? 'Remove' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
