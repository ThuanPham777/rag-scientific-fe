// src/components/chat/ChatHistoryTable.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Lock,
  Check,
  X,
  MessageSquare,
  FileText,
  Users,
  Clock,
  Loader2,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/common';
import {
  useConversationHistory,
  useUpdateConversation,
  useCloseConversation,
  useDeleteConversation,
  useCreateSession,
} from '@/hooks';
import type { ConversationHistoryItem } from '@/utils/types';
import { toast } from 'sonner';
import { useSessionStore } from '@/store/useSessionStore';

// ─── Date Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateFileName(name: string, max = 18): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
  const stem = name.slice(0, max - ext.length - 3);
  return `${stem}…${ext}`;
}

function PapersList({ papers }: { papers: ConversationHistoryItem['papers'] }) {
  if (!papers?.length) return <span className='text-gray-400 text-xs'>—</span>;
  return (
    <div className='flex flex-wrap gap-1'>
      {papers.map((p) => (
        <span
          key={p.id}
          className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700 max-w-[140px] truncate'
          title={p.fileName}
        >
          <FileText className='h-3 w-3 shrink-0' />
          {truncateFileName(p.fileName)}
        </span>
      ))}
    </div>
  );
}

function MemberAvatars({
  members,
}: {
  members?: ConversationHistoryItem['members'];
}) {
  if (!members?.length) return null;
  return (
    <div className='flex -space-x-2 mt-1'>
      {members.slice(0, 5).map((m) => (
        <div
          key={m.userId}
          title={`${m.displayName} (${m.role})`}
          className='w-6 h-6 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold'
        >
          {m.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
      ))}
      {members.length > 5 && (
        <div className='w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-gray-700 text-[10px] font-bold'>
          +{members.length - 5}
        </div>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function HistoryRow({
  item,
  onRename,
  onClose,
  onDelete,
}: {
  item: ConversationHistoryItem;
  onRename: (id: string, title: string) => void;
  onClose: (id: string) => void;
  onDelete: (item: ConversationHistoryItem) => void;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title ?? '');
  const [isSharing, setIsSharing] = useState(false);
  const createSessionMutation = useCreateSession();
  const setCollaborative = useSessionStore((s) => s.setCollaborative);
  const setInviteModalOpen = useSessionStore((s) => s.setInviteModalOpen);

  const handleRowClick = () => {
    if (editing) return;
    navigate(`/chat/${item.id}`);
  };

  const saveRename = () => {
    if (editValue.trim()) {
      onRename(item.id, editValue.trim());
    }
    setEditing(false);
  };

  const cancelRename = () => {
    setEditValue(item.title ?? '');
    setEditing(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstPaper = item.papers?.[0];
    if (!firstPaper) {
      toast.error('No paper found to share this session');
      return;
    }
    setIsSharing(true);
    try {
      const result = await createSessionMutation.mutateAsync({
        paperId: firstPaper.id,
        maxMembers: 10,
        sourceConversationId: item.id,
      });
      const newConvId = result.data.conversationId;
      setCollaborative(true);
      navigate(`/chat/${newConvId}`);
      // Open invite modal so user can share the link right away
      setTimeout(() => setInviteModalOpen(true), 300);
    } catch {
      // Error handled by mutation hook toast
    } finally {
      setIsSharing(false);
    }
  };

  // 2 types only: Personal or Collab
  const isCollab = item.isCollaborative;
  const typeBadgeClass = isCollab
    ? 'bg-purple-100 text-purple-700 border-purple-200'
    : 'bg-green-100 text-green-700 border-green-200';

  return (
    <tr
      className={`border-b hover:bg-gray-50 transition-colors ${item.isClosed ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={handleRowClick}
    >
      {/* Title */}
      <td className='px-4 py-3 min-w-[180px] max-w-[260px]'>
        {editing ? (
          <div
            className='flex items-center gap-1'
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename();
                if (e.key === 'Escape') cancelRename();
              }}
              className='h-7 text-sm'
            />
            <button
              onClick={saveRename}
              className='p-1 rounded text-green-600 hover:bg-green-50'
            >
              <Check className='h-4 w-4' />
            </button>
            <button
              onClick={cancelRename}
              className='p-1 rounded text-red-500 hover:bg-red-50'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            {item.isClosed && (
              <Lock className='h-3.5 w-3.5 text-gray-400 shrink-0' />
            )}
            <span className='font-medium text-sm text-gray-800 truncate'>
              {item.title || 'Untitled conversation'}
            </span>
          </div>
        )}
      </td>

      {/* Started */}
      <td className='px-4 py-3 text-xs text-gray-500 whitespace-nowrap'>
        <div className='flex items-center gap-1'>
          <Clock className='h-3 w-3' />
          {formatDate(item.startedAt)}
        </div>
      </td>

      {/* Last active */}
      <td className='px-4 py-3 text-xs text-gray-500 whitespace-nowrap'>
        {timeAgo(item.lastInteractionAt)}
      </td>

      {/* Messages */}
      <td className='px-4 py-3 text-xs text-gray-700 whitespace-nowrap'>
        <div className='flex items-center gap-1'>
          <MessageSquare className='h-3 w-3 text-gray-400' />
          {item.messageCount}
        </div>
      </td>

      {/* Papers */}
      <td className='px-4 py-3 max-w-[200px]'>
        <PapersList papers={item.papers} />
      </td>

      {/* Type */}
      <td className='px-4 py-3'>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeBadgeClass}`}
        >
          {isCollab && <Users className='h-3 w-3' />}
          {isCollab ? 'Collab' : 'Personal'}
        </span>
        {isCollab && item.members && (
          <MemberAvatars members={item.members} />
        )}
      </td>

      {/* Actions */}
      <td
        className='px-4 py-3 whitespace-nowrap'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            title='Rename'
            onClick={() => setEditing(true)}
          >
            <Pencil className='h-3.5 w-3.5' />
          </Button>
          {/* Share — only for non-collab, non-closed sessions that have a paper */}
          {!isCollab && !item.isClosed && item.papers?.length > 0 && (
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
              title='Start collaborative session'
              disabled={isSharing}
              onClick={handleShare}
            >
              <Share2 className='h-3.5 w-3.5' />
            </Button>
          )}
          {!item.isClosed && (
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              title='Close session'
              onClick={() => onClose(item.id)}
            >
              <Lock className='h-3.5 w-3.5' />
            </Button>
          )}
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50'
            title='Delete'
            onClick={() => onDelete(item)}
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatHistoryTable() {
  const { data: history = [], isLoading } = useConversationHistory();
  const renameMutation = useUpdateConversation();
  const closeMutation = useCloseConversation();
  const deleteMutation = useDeleteConversation();

  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] =
    useState<ConversationHistoryItem | null>(null);

  const handleRename = (id: string, title: string) => {
    renameMutation.mutate({ id, title });
  };

  const handleCloseConfirm = async () => {
    if (!closingId) return;
    await closeMutation.mutateAsync(closingId);
    setClosingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
    setDeletingItem(null);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
        <span className='ml-2 text-gray-500'>Loading history...</span>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-gray-400'>
        <MessageSquare className='h-12 w-12 mb-3 opacity-40' />
        <p className='text-lg font-medium'>No chat history yet</p>
        <p className='text-sm mt-1'>Start a conversation to see it here</p>
      </div>
    );
  }

  return (
    <>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide'>
              <th className='px-4 py-3 text-left'>Title</th>
              <th className='px-4 py-3 text-left'>Started</th>
              <th className='px-4 py-3 text-left'>Last Active</th>
              <th className='px-4 py-3 text-left'>Msgs</th>
              <th className='px-4 py-3 text-left'>Papers</th>
              <th className='px-4 py-3 text-left'>Type</th>
              <th className='px-4 py-3 text-left'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                onRename={handleRename}
                onClose={setClosingId}
                onDelete={setDeletingItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Close Confirm */}
      <ConfirmModal
        isOpen={!!closingId}
        title='Close this conversation?'
        message='Closing will lock this conversation — no new messages can be sent. You can still read the history. This cannot be undone.'
        confirmLabel='Close Session'
        cancelLabel='Cancel'
        variant='warning'
        icon={Lock}
        onConfirm={handleCloseConfirm}
        onCancel={() => setClosingId(null)}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title='Delete conversation?'
        message={`"${deletingItem?.title || 'This conversation'}" and all its messages will be permanently deleted. This action cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='danger'
        icon={Trash2}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
      />
    </>
  );
}
