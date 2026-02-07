// HighlightPopup.tsx - Popup for viewing/editing highlight comments
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trash2,
  Send,
  Edit2,
  Check,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import {
  useHighlightWithComments,
  useAddComment,
  useUpdateHighlight,
  useDeleteHighlight,
} from '../../hooks/queries/useHighlightQueries';
import {
  useUpdateComment,
  useDeleteComment,
} from '../../hooks/queries/useCommentQueries';
import type { HighlightColor } from '../../services/api/highlight.api';

type Props = {
  highlightId: string;
  paperId: string;
  position: { x: number; y: number };
  highlightColor: string;
  onClose: () => void;
};

// Must match backend HighlightColor enum
const HIGHLIGHT_COLORS: { hex: string; name: HighlightColor }[] = [
  { hex: '#ffd700', name: 'YELLOW' },
  { hex: '#90ee90', name: 'GREEN' },
  { hex: '#87ceeb', name: 'BLUE' },
  { hex: '#ffb6c1', name: 'PINK' },
  { hex: '#ffa500', name: 'ORANGE' },
];

// Map hex to enum
const hexToEnum = (hex: string): HighlightColor => {
  const found = HIGHLIGHT_COLORS.find(
    (c) => c.hex.toLowerCase() === hex.toLowerCase(),
  );
  return found?.name || 'YELLOW';
};

export default function HighlightPopup({
  highlightId,
  paperId,
  position,
  highlightColor,
  onClose,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(highlightColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch highlight with comments
  const { data: highlightData, isLoading } = useHighlightWithComments(
    highlightId,
    true,
  );

  // Mutations
  const addCommentMutation = useAddComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const updateHighlightMutation = useUpdateHighlight();
  const deleteHighlightMutation = useDeleteHighlight();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add a small delay to prevent the opening click from triggering close
    // (handles event timing edge cases)
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Add comment handler
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        highlightId,
        content: newComment.trim(),
        paperId,
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [newComment, highlightId, paperId, addCommentMutation]);

  // Update comment handler
  const handleUpdateComment = useCallback(
    async (commentId: string) => {
      if (!editingContent.trim()) return;

      try {
        await updateCommentMutation.mutateAsync({
          commentId,
          content: editingContent.trim(),
          highlightId,
        });
        setEditingCommentId(null);
        setEditingContent('');
      } catch (error) {
        console.error('Failed to update comment:', error);
      }
    },
    [editingContent, highlightId, updateCommentMutation],
  );

  // Delete comment handler
  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentMutation.mutateAsync({
          commentId,
          highlightId,
        });
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    [highlightId, deleteCommentMutation],
  );

  // Change highlight color
  const handleColorChange = useCallback(
    async (hex: string) => {
      setSelectedColor(hex);
      try {
        await updateHighlightMutation.mutateAsync({
          highlightId,
          color: hexToEnum(hex),
          paperId,
        });
      } catch (error) {
        console.error('Failed to update highlight color:', error);
      }
    },
    [highlightId, paperId, updateHighlightMutation],
  );

  // Delete highlight
  const handleDeleteHighlight = useCallback(async () => {
    try {
      await deleteHighlightMutation.mutateAsync({
        highlightId,
        paperId,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  }, [highlightId, paperId, deleteHighlightMutation, onClose]);

  // Calculate popup position (avoid going off screen)
  const getPopupStyle = () => {
    const popupWidth = 320;
    const padding = 16;

    let left = position.x;
    let top = position.y;

    // Adjust if going off right edge
    if (left + popupWidth > window.innerWidth - padding) {
      left = window.innerWidth - popupWidth - padding;
    }

    // Ensure not going off left edge
    if (left < padding) {
      left = padding;
    }

    // Ensure not going off top edge
    if (top < padding) {
      top = padding;
    }

    // Adjust if going off bottom edge - move popup above if needed
    const maxPopupHeight = Math.min(400, window.innerHeight - padding * 2);
    if (top + maxPopupHeight > window.innerHeight - padding) {
      top = window.innerHeight - maxPopupHeight - padding;
    }

    return { left, top, maxHeight: maxPopupHeight };
  };

  const popupStyle = getPopupStyle();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const comments = highlightData?.comments || [];

  return createPortal(
    <div
      ref={popupRef}
      className='fixed bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col'
      style={{
        left: popupStyle.left,
        top: popupStyle.top,
        width: '320px',
        maxHeight: `${popupStyle.maxHeight}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      data-highlight-popup='true'
    >
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200'>
        <div className='flex items-center gap-2'>
          <MessageCircle
            size={16}
            className='text-gray-500'
          />
          <span className='font-medium text-sm text-gray-700'>
            {comments.length} Comment{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className='p-1 hover:bg-gray-200 rounded transition'
        >
          <X
            size={16}
            className='text-gray-500'
          />
        </button>
      </div>

      {/* Color picker */}
      <div className='px-4 py-2 flex items-center gap-2 border-b border-gray-100'>
        <span className='text-xs text-gray-500'>Color:</span>
        <div className='flex gap-1'>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.hex}
              className={`w-5 h-5 rounded-full transition hover:scale-110 ${
                selectedColor.toLowerCase() === c.hex.toLowerCase()
                  ? 'ring-2 ring-offset-1 ring-gray-400'
                  : ''
              }`}
              style={{ backgroundColor: c.hex }}
              onClick={() => handleColorChange(c.hex)}
              disabled={updateHighlightMutation.isPending}
            />
          ))}
        </div>
        <div className='flex-1' />
        <button
          onClick={handleDeleteHighlight}
          disabled={deleteHighlightMutation.isPending}
          className='p-1.5 text-red-500 hover:bg-red-50 rounded transition'
          title='Delete highlight'
        >
          {deleteHighlightMutation.isPending ? (
            <Loader2
              size={14}
              className='animate-spin'
            />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>

      {/* Comments list */}
      <div className='max-h-[200px] overflow-y-auto'>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2
              className='animate-spin text-gray-400'
              size={24}
            />
          </div>
        ) : comments.length === 0 ? (
          <div className='text-center py-6 text-gray-400 text-sm'>
            No comments yet
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {comments.map((comment) => (
              <div
                key={comment.id}
                className='px-4 py-3'
              >
                {editingCommentId === comment.id ? (
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className='flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500'
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateComment(comment.id);
                        } else if (e.key === 'Escape') {
                          setEditingCommentId(null);
                          setEditingContent('');
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      disabled={updateCommentMutation.isPending}
                      className='p-1 text-green-600 hover:bg-green-50 rounded'
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditingContent('');
                      }}
                      className='p-1 text-gray-400 hover:bg-gray-100 rounded'
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className='text-sm text-gray-700'>{comment.content}</p>
                    <div className='flex items-center justify-between mt-1'>
                      <span className='text-xs text-gray-400'>
                        {formatDate(comment.createdAt)}
                      </span>
                      <div className='flex gap-1'>
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingContent(comment.content);
                          }}
                          className='p-1 text-gray-400 hover:bg-gray-100 rounded'
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          className='p-1 text-red-400 hover:bg-red-50 rounded'
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add comment input */}
      <div className='border-t border-gray-200 px-4 py-3'>
        <div className='flex gap-2'>
          <input
            ref={inputRef}
            type='text'
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder='Add a comment...'
            className='flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddComment();
              }
            }}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className='px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition'
          >
            {addCommentMutation.isPending ? (
              <Loader2
                size={16}
                className='animate-spin'
              />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
