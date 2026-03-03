import { useEffect, useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle, Pencil, Trash2, Share2, Copy, Check, Users, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import notebookService from '@/services/notebookService';

export default function NotebookListTable() {
  const qc = useQueryClient();

  const { data: myNotebooks = [], isLoading: myLoading, refetch: refetchMy } = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.list(),
  });

  const { data: sharedNotebooks = [], isLoading: sharedLoading, refetch: refetchShared } = useQuery({
    queryKey: ['notebooks-shared'],
    queryFn: () => notebookService.listSharedWithMe(),
  });

  useEffect(() => {
    refetchMy();
    refetchShared();
  }, []);

  // Split owned notebooks: regular vs collaborative (shared copies)
  const regularNotebooks = myNotebooks.filter((nb: any) => !nb.isCollaborative);
  const mySharedNotebooks = myNotebooks.filter((nb: any) => nb.isCollaborative);

  // Section collapse
  const [myOpen, setMyOpen] = useState(true);
  const [mySharedOpen, setMySharedOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(true);

  const createNew = async () => {
    const created = await notebookService.create({ title: 'Untitled' });
    qc.invalidateQueries({ queryKey: ['notebooks'] });
    window.open(`/notebooks/${created.id}`, '_blank');
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Share state
  const [shareModal, setShareModal] = useState<{ notebookId: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState<string | null>(null);

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

  const handleDeleteClick = (e: React.MouseEvent, nb: any, isShared = false) => {
    e.stopPropagation();
    setDeleteTarget({ ...nb, isShared });
  };

  const handleShareClick = async (e: React.MouseEvent, nb: any) => {
    e.stopPropagation();
    setShareLoading(nb.id);
    try {
      const result = await notebookService.share(nb.id);
      const shareUrl = `${window.location.origin}/notebook/join/${result.shareToken}`;
      setShareModal({ notebookId: result.notebookId, shareUrl });
      setCopied(false);
      qc.invalidateQueries({ queryKey: ['notebooks'] });
    } catch (err) {
      console.error('Failed to share notebook', err);
      window.alert('Failed to share notebook');
    }
    setShareLoading(null);
  };

  const handleCopyLink = async () => {
    if (!shareModal) return;
    try {
      await navigator.clipboard.writeText(shareModal.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareModal.shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await notebookService.remove(deleteTarget.id);
      qc.invalidateQueries({ queryKey: ['notebooks'] });
      qc.invalidateQueries({ queryKey: ['notebooks-shared'] });
    } catch (err) {
      console.error('Failed to delete/hide notebook', err);
    }
    setDeleteTarget(null);
  }, [deleteTarget, qc]);

  const renderRows = (notebooks: any[], isShared: boolean) => {
    if (notebooks.length === 0) {
      return (
        <tr>
          <td colSpan={3} className='p-6 text-center text-gray-400 text-sm'>
            {isShared ? 'No notebooks shared with you yet' : 'No notebooks yet'}
          </td>
        </tr>
      );
    }

    return notebooks.map((nb: any) => (
      <tr
        key={nb.id}
        className='hover:bg-gray-50 cursor-pointer'
        onClick={() => window.open(`/notebooks/${nb.id}`, '_blank')}
      >
        <td className='px-4 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <div className='truncate max-w-[14rem]'>
              {!isShared && editingId === nb.id ? (
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
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='truncate'>{nb.title || 'Untitled'}</span>
                    {nb.isCollaborative && (
                      <span title='Collaborative'>
                        <Users size={13} className='text-indigo-500 flex-shrink-0' />
                      </span>
                    )}
                  </div>
                  {isShared && nb.ownerName && (
                    <div className='text-xs text-indigo-500 mt-0.5 flex items-center gap-1'>
                      <Users size={10} />
                      by {nb.ownerName}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className='flex items-center gap-1'>
              {!isShared && (
                <>
                  <button
                    onClick={(e) => handleShareClick(e, nb)}
                    className='p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors'
                    title='Share'
                    disabled={shareLoading === nb.id}
                  >
                    {shareLoading === nb.id ? (
                      <div className='w-[14px] h-[14px] border-2 border-indigo-400 border-t-transparent rounded-full animate-spin' />
                    ) : (
                      <Share2 size={14} />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleRenameStart(e, nb)}
                    className='p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'
                    title='Rename'
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, nb, false)}
                    className='p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors'
                    title='Delete'
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              {isShared && (
                <button
                  onClick={(e) => handleDeleteClick(e, nb, true)}
                  className='p-1.5 rounded-md text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors'
                  title='Remove from list'
                >
                  <EyeOff size={14} />
                </button>
              )}
            </div>
          </div>
        </td>
        <td className='px-4 py-3 text-gray-600 truncate max-w-xl'>{nb.contentPreview || ''}</td>
        <td className='px-4 py-3 text-gray-500'>{new Date(nb.updatedAt).toLocaleString()}</td>
      </tr>
    ));
  };

  const isLoading = myLoading || sharedLoading;

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

      {isLoading ? (
        <div className='bg-white border rounded-md p-6 text-center text-gray-500'>Loading...</div>
      ) : (
        <div className='space-y-4'>
          {/* ── My Notebooks ── */}
          <div className='bg-white border rounded-md overflow-hidden'>
            <button
              onClick={() => setMyOpen((v) => !v)}
              className='w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors border-b'
            >
              {myOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              📓 My Notebooks
              <span className='ml-auto text-gray-400 font-normal'>{regularNotebooks.length}</span>
            </button>
            {myOpen && (
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 border-b'>
                  <tr>
                    <th className='text-left px-4 py-2 text-gray-500 font-medium'>Name</th>
                    <th className='text-left px-4 py-2 text-gray-500 font-medium'>Preview</th>
                    <th className='text-left px-4 py-2 text-gray-500 font-medium'>Updated</th>
                  </tr>
                </thead>
                <tbody>{renderRows(regularNotebooks, false)}</tbody>
              </table>
            )}
          </div>

          {/* ── My Shared (collaborative copies I own) ── */}
          {mySharedNotebooks.length > 0 && (
            <div className='bg-white border border-violet-100 rounded-md overflow-hidden'>
              <button
                onClick={() => setMySharedOpen((v) => !v)}
                className='w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors border-b border-violet-100'
              >
                {mySharedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Share2 size={14} /> My Shared
                <span className='ml-auto text-violet-300 font-normal'>{mySharedNotebooks.length}</span>
              </button>
              {mySharedOpen && (
                <table className='w-full text-sm'>
                  <thead className='bg-violet-50/50 border-b border-violet-100'>
                    <tr>
                      <th className='text-left px-4 py-2 text-violet-400 font-medium'>Name</th>
                      <th className='text-left px-4 py-2 text-violet-400 font-medium'>Preview</th>
                      <th className='text-left px-4 py-2 text-violet-400 font-medium'>Updated</th>
                    </tr>
                  </thead>
                  <tbody>{renderRows(mySharedNotebooks, false)}</tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Shared with me ── */}
          <div className='bg-white border border-indigo-100 rounded-md overflow-hidden'>
            <button
              onClick={() => setSharedOpen((v) => !v)}
              className='w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border-b border-indigo-100'
            >
              {sharedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Users size={14} /> Shared with me
              <span className='ml-auto text-indigo-300 font-normal'>{sharedNotebooks.length}</span>
            </button>
            {sharedOpen && (
              <table className='w-full text-sm'>
                <thead className='bg-indigo-50/50 border-b border-indigo-100'>
                  <tr>
                    <th className='text-left px-4 py-2 text-indigo-400 font-medium'>Name</th>
                    <th className='text-left px-4 py-2 text-indigo-400 font-medium'>Preview</th>
                    <th className='text-left px-4 py-2 text-indigo-400 font-medium'>Updated</th>
                  </tr>
                </thead>
                <tbody>{renderRows(sharedNotebooks, true)}</tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Delete / Remove confirmation modal */}
    {deleteTarget && (
      <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setDeleteTarget(null)}>
        <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
        <div
          className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-start gap-4'>
            <div className={`p-2 rounded-full flex-shrink-0 ${deleteTarget.isShared ? 'bg-orange-100' : 'bg-red-100'}`}>
              {deleteTarget.isShared
                ? <EyeOff size={22} className='text-orange-500' />
                : <AlertTriangle size={22} className='text-red-600' />
              }
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {deleteTarget.isShared ? 'Remove shared notebook' : 'Delete Notebook'}
              </h3>
              <p className='mt-2 text-sm text-gray-600'>
                {deleteTarget.isShared
                  ? <>Remove <span className='font-medium text-gray-900'>"{deleteTarget.title || 'Untitled'}"</span> from your shared list? The notebook still exists for the owner.</>
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

    {/* Share link modal */}
    {shareModal && (
      <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setShareModal(null)}>
        <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
        <div
          className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-start gap-4'>
            <div className='p-2 bg-indigo-100 rounded-full flex-shrink-0'>
              <Share2 size={22} className='text-indigo-600' />
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-gray-900'>Share Notebook</h3>
              <p className='mt-2 text-sm text-gray-600'>
                Share this link so others can collaborate in real-time.
              </p>
            </div>
          </div>
          <div className='mt-4 flex items-center gap-2'>
            <input
              readOnly
              value={shareModal.shareUrl}
              className='flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-700 select-all'
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className='flex justify-end mt-5'>
            <button
              onClick={() => setShareModal(null)}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
