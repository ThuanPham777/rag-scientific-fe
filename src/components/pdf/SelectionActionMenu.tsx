import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Highlighter,
  ListTree,
  NotebookPen,
  PanelRightOpen,
  TextQuote,
  Search,
  Plus,
  X,
  ChevronRight,
} from 'lucide-react';
import HighlightEditor from './HighlightEditor';
import { useAuthStore } from '@/store/useAuthStore';
import notebookService, { type NotebookItem } from '@/services/notebookService';
import { useUiStore } from '@/store/useUiStore';
import AuthModal from '@/components/auth/AuthModal';
import { useGuestStore } from '@/store/useGuestStore';
import { useGuestLimitStore } from '@/store/useGuestLimitStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  selection: {
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
    anchor: { x: number; y: number };
  };
  scale: number;
  onAction: (
    action: 'explain' | 'summarize' | 'related' | 'highlight' | 'save',
    payload: {
      text: string;
      pageNumber: number;
      rects: HighlightRect[];
      color?: string;
      comment?: string;
    },
  ) => void;
  onAddHighlight: (
    color?: string,
    comment?: string,
    shouldClose?: boolean,
  ) => void;
  onRemoveHighlight?: () => void;
  onFinalizeHighlight?: () => void; // Called when user clicks Save to close editor
  selectedColorDefault?: string;
  onSelectedColorChange?: (color: string | undefined) => void;
  onSaveComment?: (comment: string) => void;
  pageRef?: HTMLDivElement | null;
};

export default function SelectionActionMenu({
  selection,
  scale,
  onAction,
  onAddHighlight,
  onRemoveHighlight,
  onFinalizeHighlight,
  selectedColorDefault,
  onSelectedColorChange,
  onSaveComment,
  pageRef,
}: Props) {
  const { isAuthenticated } = useAuthStore();
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [showColorPopup, setShowColorPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    selectedColorDefault,
  );
  const [showMainPopup, setShowMainPopup] = useState(true);
  const [currentComment, setCurrentComment] = useState('');

  // --- Notebook picker state ---
  const [showNotebookPicker, setShowNotebookPicker] = useState(false);
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [nbSearch, setNbSearch] = useState('');
  const [nbLoading, setNbLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const nbSearchRef = useRef<HTMLInputElement>(null);
  const newTitleRef = useRef<HTMLInputElement>(null);

  const filteredNotebooks = useMemo(
    () =>
      nbSearch.trim()
        ? notebooks.filter((nb) =>
            (nb.title || 'Untitled')
              .toLowerCase()
              .includes(nbSearch.toLowerCase()),
          )
        : notebooks,
    [notebooks, nbSearch],
  );

  const loadNotebooks = useCallback(async () => {
    setNbLoading(true);
    try {
      const list = await notebookService.list();
      setNotebooks(list);
    } catch (err) {
      console.error('Failed to load notebooks', err);
    } finally {
      setNbLoading(false);
    }
  }, []);

  // Focus search when picker opens
  useEffect(() => {
    if (showNotebookPicker) {
      setTimeout(() => nbSearchRef.current?.focus(), 100);
    }
  }, [showNotebookPicker]);

  // Focus title input when create dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      setTimeout(() => newTitleRef.current?.focus(), 100);
    }
  }, [showCreateDialog]);

  const handleSelectNotebook = useCallback(
    async (nbId: string) => {
      setSaving(true);
      try {
        // Get existing notebook content and append
        const existing = await notebookService.get(nbId);
        const appendedContent =
          (existing.content || '') + `<p>${selection.text}</p>`;
        await notebookService.update(nbId, { content: appendedContent });
        // Open sidebar and select the notebook
        const { openNotebooks, setPendingNotebookId } = useUiStore.getState();
        setPendingNotebookId(nbId);
        openNotebooks();
      } catch (err) {
        console.error('Failed to save to notebook', err);
      } finally {
        setSaving(false);
        setShowNotebookPicker(false);
        setShowMainPopup(false);
      }
    },
    [selection.text],
  );

  const handleCreateNotebook = useCallback(async () => {
    if (!newNbTitle.trim()) return;
    setSaving(true);
    try {
      const created = await notebookService.create({
        title: newNbTitle.trim(),
        content: `<p>${selection.text}</p>`,
      });
      const { openNotebooks, setPendingNotebookId } = useUiStore.getState();
      setPendingNotebookId(created.id);
      openNotebooks();
    } catch (err) {
      console.error('Failed to create notebook', err);
    } finally {
      setSaving(false);
      setShowCreateDialog(false);
      setShowNotebookPicker(false);
      setShowMainPopup(false);
      setNewNbTitle('');
    }
  }, [newNbTitle, selection.text]);
  const [fixedPosition, setFixedPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Calculate fixed position for portal
  useEffect(() => {
    if (pageRef) {
      const pageRect = pageRef.getBoundingClientRect();
      setFixedPosition({
        top: pageRect.top + selection.anchor.y,
        left: pageRect.left + selection.anchor.x,
      });
    }
  }, [pageRef, selection.anchor.x, selection.anchor.y]);

  // Tính toán kích thước popup dựa trên scale
  const popupWidth = Math.max(200, Math.min(320, 200 + (scale - 1) * 50));
  const fontSize = Math.max(12, Math.min(16, 12 + (scale - 1) * 2));
  const wordCount = selection.text.trim().split(/\s+/).filter(Boolean).length;
  const canSummarize = wordCount >= 50;

  // Guard: always block unauthenticated users (for auth-only features like highlight, notebook)
  const guardGuestAuth = (): boolean => {
    if (!isAuthenticated) {
      setShowGuestAuthModal(true);
      return true; // blocked
    }
    return false;
  };

  // Guard for AI actions (explain, summarize): allow if guest limit not reached
  // The actual limit increment happens in ChatPage when the API is called.
  const guardGuestAiLimit = (): boolean => {
    if (!isAuthenticated) {
      if (!useGuestLimitStore.getState().canMakeAiRequest()) {
        setShowGuestAuthModal(true);
        return true; // blocked — limit exceeded
      }
    }
    return false; // allowed
  };

  const fire = (type: Parameters<typeof onAction>[0]) => {
    // explain / summarize → use AI-limit guard (guests get 1 free request)
    if (type === 'explain' || type === 'summarize') {
      if (guardGuestAiLimit()) return;
    } else {
      // related, highlight, notebook, etc. → require full auth
      if (guardGuestAuth()) return;
    }
    onAction(type, {
      text: selection.text,
      pageNumber: selection.pageNumber,
      rects: selection.rects,
    });
  };

  const handleSelectColor = useCallback(
    (color: string) => {
      setSelectedColor(color);
      onSelectedColorChange?.(color);
      // Update the highlight color but keep editor open
      onAddHighlight(color, currentComment, false);
    },
    [onSelectedColorChange, onAddHighlight, currentComment],
  );

  const handleRemoveHighlight = useCallback(() => {
    if (onRemoveHighlight) {
      onRemoveHighlight();
      setShowColorPopup(false);
      setSelectedColor(undefined);
      onSelectedColorChange?.(undefined);
      setShowMainPopup(true);
      setCurrentComment('');
    }
  }, [onRemoveHighlight, onSelectedColorChange]);

  const handleSaveComment = useCallback(
    (comment: string) => {
      setCurrentComment(comment);
      onSaveComment?.(comment);
      if (selectedColor) {
        // Save final highlight with comment and close editor
        onAddHighlight(selectedColor, comment, true);
      }
      // Finalize and close
      onFinalizeHighlight?.();
    },
    [onSaveComment, selectedColor, onAddHighlight, onFinalizeHighlight],
  );

  if (
    !showMainPopup &&
    !showColorPopup &&
    !showNotebookPicker &&
    !showCreateDialog
  ) {
    // Still render AuthModal even when menu is hidden
    if (showGuestAuthModal) {
      return (
        <AuthModal
          isOpen={showGuestAuthModal}
          onClose={() => setShowGuestAuthModal(false)}
          initialMode='login'
          onLoginSuccess={() => {
            const guestSession = useGuestStore.getState().currentSession;
            if (guestSession) {
              window.location.href = `/chat/${guestSession.id}`;
            }
          }}
        />
      );
    }
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Use portal for proper layering above PDF viewer
  // Hide popup content when guest AuthModal is open
  const popupContent = showGuestAuthModal ? null : (
    <div
      ref={popupRef}
      className='fixed'
      style={{
        left: fixedPosition?.left ?? selection.anchor.x,
        top: fixedPosition?.top ?? selection.anchor.y,
        width: `${popupWidth}px`,
        zIndex: 99999,
      }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      data-selection-popup='true'
    >
      {showMainPopup && !showColorPopup && (
        <div
          className='rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden'
          style={{ fontSize: `${fontSize}px` }}
        >
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
            onClick={() => fire('explain')}
          >
            <TextQuote size={16} /> Explain text
          </button>
          {canSummarize ? (
            <button
              className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
              onClick={() => fire('summarize')}
            >
              <ListTree size={16} /> Summarize
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className='w-full flex items-center gap-2 px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled
                >
                  <ListTree size={16} /> Summarize
                </button>
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='max-w-xs z-[99999]'
              >
                <p>Select at least 50 words to summarize ({wordCount}/50)</p>
              </TooltipContent>
            </Tooltip>
          )}
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
            onClick={() => fire('related')}
          >
            <PanelRightOpen size={16} /> Get Related papers
          </button>
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left relative'
            onClick={() => {
              if (guardGuestAuth()) return;
              // Immediately create highlight with default color, keep editor open
              const defaultColor = selectedColorDefault || '#ffd700';
              setSelectedColor(defaultColor);
              setShowColorPopup(true);
              setShowMainPopup(false);
              // Create the highlight immediately but don't close the selection
              onAddHighlight(defaultColor, undefined, false);
            }}
          >
            <Highlighter size={16} /> Highlight
          </button>
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left'
            onClick={() => {
              if (guardGuestAuth()) return;
              fire('save');
            }}
          >
            <NotebookPen size={16} /> Save to notebook
          </button>
          <button
            className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left justify-between'
            onClick={() => {
              if (guardGuestAuth()) return;
              setShowNotebookPicker(true);
              setShowMainPopup(false);
              loadNotebooks();
            }}
          >
            <span className='flex items-center gap-2'>
              <ListTree size={16} /> Select a notebook
            </span>
            <ChevronRight
              size={14}
              className='text-gray-400'
            />
          </button>
        </div>
      )}

      {/* Notebook Picker Dropdown */}
      {showNotebookPicker && !showCreateDialog && (
        <div
          className='rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden'
          style={{ fontSize: `${fontSize}px`, minWidth: '240px' }}
        >
          {/* Search bar */}
          <div className='flex items-center gap-2 px-3 py-2 border-b border-gray-100'>
            <Search
              size={14}
              className='text-gray-400 flex-shrink-0'
            />
            <input
              ref={nbSearchRef}
              value={nbSearch}
              onChange={(e) => setNbSearch(e.target.value)}
              placeholder='Search'
              className='flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400'
            />
            {nbSearch && (
              <button
                onClick={() => setNbSearch('')}
                className='text-gray-400 hover:text-gray-600'
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Notebook list */}
          <div className='max-h-48 overflow-y-auto'>
            {nbLoading ? (
              <div className='px-3 py-4 text-center text-sm text-gray-400'>
                Loading...
              </div>
            ) : filteredNotebooks.length === 0 ? (
              <div className='px-3 py-4 text-center text-sm text-gray-400'>
                {nbSearch ? 'No notebooks found' : 'No notebooks yet'}
              </div>
            ) : (
              filteredNotebooks.map((nb) => (
                <button
                  key={nb.id}
                  className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm disabled:opacity-50'
                  onClick={() => handleSelectNotebook(nb.id)}
                  disabled={saving}
                >
                  {nb.title || 'Untitled'}
                </button>
              ))
            )}
          </div>

          {/* Create new notebook */}
          <div className='border-t border-gray-100'>
            <button
              className='w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm font-medium'
              onClick={() => {
                setShowCreateDialog(true);
                setNewNbTitle('');
              }}
              disabled={saving}
            >
              <Plus size={14} /> Create New Notebook
            </button>
          </div>
        </div>
      )}

      {/* Create New Notebook Dialog */}
      {showCreateDialog && (
        <div
          className='rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden'
          style={{ minWidth: '280px' }}
        >
          <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100'>
            <span className='font-medium text-sm'>New Notebook</span>
            <button
              onClick={() => {
                setShowCreateDialog(false);
                setShowNotebookPicker(true);
              }}
              className='text-gray-400 hover:text-gray-600'
            >
              <X size={16} />
            </button>
          </div>
          <div className='px-4 py-3'>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              Notebook Title
            </label>
            <input
              ref={newTitleRef}
              value={newNbTitle}
              onChange={(e) => setNewNbTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNbTitle.trim())
                  handleCreateNotebook();
                if (e.key === 'Escape') {
                  setShowCreateDialog(false);
                  setShowNotebookPicker(true);
                }
              }}
              placeholder='Eg. My new Notebook'
              className='w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
            />
          </div>
          <div className='flex justify-end gap-2 px-4 py-3 border-t border-gray-100'>
            <button
              onClick={() => {
                setShowCreateDialog(false);
                setShowNotebookPicker(true);
              }}
              className='px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md'
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNotebook}
              disabled={!newNbTitle.trim() || saving}
              className='px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50'
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}
      {isAuthenticated && showColorPopup && (
        <HighlightEditor
          onSelectColor={handleSelectColor}
          onRemoveHighlight={handleRemoveHighlight}
          selectedColor={selectedColor}
          onSaveComment={handleSaveComment}
          initialComment={currentComment}
          position={fixedPosition ?? undefined}
          usePortal={false}
        />
      )}
    </div>
  );

  // Guest auth modal handler
  const handleGuestLoginSuccess = () => {
    // After login/signup, if guest had chat data, navigate to it
    // (auto-migration in ChatPage handles the rest)
    const guestSession = useGuestStore.getState().currentSession;
    if (guestSession) {
      window.location.href = `/chat/${guestSession.id}`;
    }
  };

  // Render via portal to escape overflow clipping
  return (
    <>
      {createPortal(popupContent, document.body)}
      <AuthModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        initialMode='login'
        onLoginSuccess={handleGuestLoginSuccess}
      />
    </>
  );
}
