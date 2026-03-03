import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Share2, Copy, Check, Users, BookX } from 'lucide-react';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';

export default function NotebookViewerPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const qc = useQueryClient();

  // Share state
  const [shareModal, setShareModal] = useState<{ notebookId: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        // Try collaborative endpoint first, fall back to regular
        let d: any;
        try {
          d = await notebookService.getCollaborative(id);
        } catch {
          d = await notebookService.get(id);
        }
        setNotebook(d);
      } catch (err: any) {
        console.error('Failed to load notebook', err);
        // 404 or 403 → notebook was deleted or inaccessible
        setNotFound(true);
      }
    };
    load();
  }, [id]);

  // If notebook fails to load, show a friendly "deleted" screen
  if (notFound) {
    return (
      <div className='h-screen w-full bg-gray-50 flex items-center justify-center px-4'>
        <div className='bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <BookX size={32} className='text-red-500' />
          </div>
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>Notebook không còn tồn tại</h2>
          <p className='text-sm text-gray-500 mb-6'>
            Notebook này đã bị xóa bởi chủ sở hữu hoặc bạn không còn quyền truy cập.
          </p>
          <button
            onClick={() => navigate('/library')}
            className='w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors'
          >
            <ArrowLeft size={16} />
            Về My Library
          </button>
        </div>
      </div>
    );
  }

  const handleUpdated = (updated: any) => {
    setNotebook(updated);
    qc.invalidateQueries({ queryKey: ['notebooks'] });
  };

  const handleShare = async () => {
    if (!notebook) return;
    setShareLoading(true);
    try {
      const result = await notebookService.share(notebook.id);
      const shareUrl = `${window.location.origin}/notebook/join/${result.shareToken}`;
      setShareModal({ notebookId: result.notebookId, shareUrl });
      setCopied(false);
    } catch (err) {
      console.error('Failed to share notebook', err);
    }
    setShareLoading(false);
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

  return (
    <div className='h-screen w-full bg-gray-100 flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm relative'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => window.history.back()}
            className='p-1 rounded hover:bg-gray-200'
            title='Back'
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-lg font-semibold truncate max-w-xs'>
            {notebook?.title || 'Untitled'}
          </h1>
          {notebook?.isCollaborative && (
            <span className='flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full'>
              <Users size={12} />
              Collaborative
            </span>
          )}
        </div>

        <div className='flex items-center gap-4'>
          {/* Online collaborators */}
          {notebook?.collaborators && notebook.collaborators.length > 0 && (
            <div className='flex items-center -space-x-2'>
              {notebook.collaborators.slice(0, 5).map((c: any) => (
                <div
                  key={c.userId}
                  title={c.user?.displayName || 'User'}
                  className='w-7 h-7 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700'
                >
                  {c.user?.avatarUrl ? (
                    <img src={c.user.avatarUrl} className='w-full h-full rounded-full object-cover' alt='' />
                  ) : (
                    (c.user?.displayName || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              {notebook.collaborators.length > 5 && (
                <div className='w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600'>
                  +{notebook.collaborators.length - 5}
                </div>
              )}
            </div>
          )}

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className='flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50'
          >
            {shareLoading ? (
              <div className='w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin' />
            ) : (
              <Share2 size={15} />
            )}
            Share
          </button>
        </div>
      </div>

      <div className='flex-1 max-w-6xl mx-auto h-full p-6'>
        <div className='bg-white h-full shadow rounded'>
          {notebook ? (
            <NotebookEditor key={notebook.id} notebook={notebook} onUpdated={handleUpdated} />
          ) : (
            <div className='flex items-center justify-center h-full'>
              <div className='w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin' />
            </div>
          )}
        </div>
      </div>

      {/* Share link modal */}
      {shareModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setShareModal(null)}>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' />
          <div
            className='relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-start gap-4'>
              <div className='p-2 bg-indigo-100 rounded-full flex-shrink-0'>
                <Share2 size={22} className='text-indigo-600' />
              </div>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-gray-900'>Share Notebook</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Share this link to collaborate in real-time.
                </p>
              </div>
            </div>
            <div className='mt-4 flex items-center gap-2'>
              <input
                readOnly
                value={shareModal.shareUrl}
                className='flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-700'
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
    </div>
  );
}
