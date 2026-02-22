import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Loader2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiPaperChatStore } from '../store/useMultiPaperChatStore';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/common';
import {
  useUpload,
  usePaperActions,
  useMultiPaperChat,
  usePapers,
  useClearChatHistory,
  useSessions,
  paperKeys,
  useFolders,
  useFolder,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '../hooks';
// import {
//   FolderSidebar,
//   PaperTable,
//   UploadDialog,
//   CreateFolderDialog,
//   EditFolderDialog,
//   DeleteFolderDialog,
//   DeletePaperDialog,
//   MovePaperDialog,
// } from '../components/library';
import NotebookListTable from '@/components/notebook/NotebookListTable';
import ChatDock from '../components/chat/ChatDock';
import { FolderSelectModal } from '@/components/uploader/FolderSelectModal';
import { useFolderStore } from '@/store/useFolderStore';
import type { Folder as FolderType } from '../utils/types';
import { FolderSidebar } from '@/components/library/FolderSidebar';
import { DeletePaperDialog, PaperTable } from '@/components/library';
import {
  CreateFolderDialog,
  DeleteFolderDialog,
  EditFolderDialog,
} from '@/components/library/FolderDialogs';
import { MovePaperDialog } from '@/components/library/MovePaperDialog';

export default function MyLibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { folderId: urlFolderId } = useParams<{ folderId?: string }>();

  // Determine if we're in folder view mode (via URL)
  const isInFolderView = !!urlFolderId;

  // =========================================
  // React Query hooks (server state)
  // =========================================
  const { data: folders = [], isLoading: isLoadingFolders } = useFolders();

  // Zustand UI state for selected folder
  const { selectedFolderId, selectFolder, clearSelectedFolder } =
    useFolderStore();

  // Fetch folder details when selected
  const { data: selectedFolder, isLoading: isLoadingFolderPapers } = useFolder(
    selectedFolderId ?? undefined,
  );

  // React Query mutations
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();

  // =========================================
  // React Query hooks (server state)
  // =========================================
  const {
    data: allPapers = [],
    isLoading: isLoadingAllPapers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    hasProcessingPapers,
  } = usePapers();

  // React Query mutations
  const clearChatHistoryMutation = useClearChatHistory();

  // Multi-paper chat state (UI state in Zustand)
  const { selectedPapers, togglePaper, deselectPaper, clearSelection } =
    useMultiPaperChatStore();

  // Confirm modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    messages: multiChatMessages,
    isLoading: isMultiChatLoading,
    sendMessage: sendMultiMessage,
    currentConversationId: multiChatConversationId,
    clearChat: clearMultiChat,
    fetchNextPage: fetchMoreMultiMessages,
    hasNextPage: hasMoreMultiMessages,
    isFetchingNextPage: isFetchingMoreMultiMessages,
  } = useMultiPaperChat();

  // Handle clear chat history for multi-paper mode
  const handleClearMultiChatHistory = useCallback((conversationId: string) => {
    if (!conversationId) return;
    setShowClearConfirm(true);
  }, []);

  const confirmClearMultiChatHistory = useCallback(async () => {
    setShowClearConfirm(false);
    if (!multiChatConversationId) return;

    try {
      await clearChatHistoryMutation.mutateAsync(multiChatConversationId);
      clearMultiChat();
    } catch (err) {
      console.error('Failed to clear multi-paper chat history:', err);
    }
  }, [clearChatHistoryMutation, clearMultiChat, multiChatConversationId]);

  // View state (UI state)
  // If URL has folderId, use it; otherwise default to 'all'
  const [selectedView, setSelectedView] = useState<'all' | string>(
    urlFolderId || 'all',
  );
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  // Folder dialog states (UI state)
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [folderName, setFolderName] = useState('');

  // Sync selectedView with URL params when navigating via URL
  useEffect(() => {
    if (urlFolderId) {
      setSelectedView(urlFolderId);
      selectFolder(urlFolderId);
    } else {
      setSelectedView('all');
      clearSelectedFolder();
    }
  }, [urlFolderId, selectFolder, clearSelectedFolder]);

  // Sync selectedView with Zustand store (for sidebar navigation)
  useEffect(() => {
    if (!urlFolderId) {
      // Only sync with store if not in URL folder view
      if (selectedView === 'all') {
        clearSelectedFolder();
      } else {
        selectFolder(selectedView);
      }
    }
  }, [selectedView, selectFolder, clearSelectedFolder, urlFolderId]);

  // Get current folder name for auto-assign mode
  const currentFolderForUpload = useMemo(() => {
    if (isInFolderView && urlFolderId) {
      return folders.find((f) => f.id === urlFolderId);
    }
    return undefined;
  }, [isInFolderView, urlFolderId, folders]);

  // Upload hook with folder context awareness
  const upload = useUpload({
    selectedView,
    // When in folder view (via URL), enable auto-assign mode
    currentFolderId: isInFolderView ? urlFolderId : undefined,
    currentFolderName: currentFolderForUpload?.name,
  });

  // Paper actions hook
  const paperActions = usePaperActions({});

  // Fetch active sessions to identify group papers
  const { data: sessions = [] } = useSessions();
  const groupPaperIds = new Set(
    sessions
      .filter((s: any) => s.isCollaborative && s.paperId)
      .map((s: any) => s.paperId),
  );

  // Auth redirect is handled by <ProtectedRoute> wrapper in App.tsx

  // Handle view change with URL navigation
  const handleViewChange = useCallback(
    (view: 'all' | string) => {
      setSelectedView(view);
      if (view === 'all') {
        navigate('/library');
      } else {
        navigate(`/library/folder/${view}`);
      }
    },
    [navigate],
  );

  // Folder handlers using React Query mutations
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({ name: folderName.trim() });
      setShowCreateDialog(false);
      setFolderName('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !folderName.trim()) return;
    try {
      await updateFolderMutation.mutateAsync({
        id: editingFolder.id,
        data: { name: folderName.trim() },
      });
      setShowEditDialog(false);
      setEditingFolder(null);
      setFolderName('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    try {
      await deleteFolderMutation.mutateAsync(deletingFolder.id);
      setShowDeleteDialog(false);
      setDeletingFolder(null);
      if (selectedView === deletingFolder.id) {
        handleViewChange('all');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const openEditDialog = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingFolder(folder);
    setShowDeleteDialog(true);
  };

  const openCreateDialog = () => {
    setFolderName('');
    setShowCreateDialog(true);
  };

  // Auto-refresh papers when there are processing papers
  useEffect(() => {
    if (!hasProcessingPapers) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: paperKeys.infinite() });
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [hasProcessingPapers, queryClient]);

  // Determine which papers to display based on current view
  const displayPapers = useMemo(() => {
    if (isInFolderView && selectedFolder?.papers) {
      return selectedFolder.papers;
    }
    return allPapers;
  }, [isInFolderView, selectedFolder, allPapers]);

  // Determine current view name for header
  const currentViewName =
    selectedView === 'all'
      ? 'All files'
      : selectedView === 'notebooks'
        ? 'Notebooks'
        : selectedFolder?.name || 'Loading...';

  // Multi-select handlers
  const selectedPaperIds = selectedPapers.map((p) => p.id);

  const handleSelectAll = () => {
    displayPapers.forEach((paper) => {
      if (!selectedPaperIds.includes(paper.id)) {
        togglePaper(paper);
      }
    });
  };

  const handleDeselectAll = () => {
    clearSelection();
  };

  // Prepare selected papers for ChatDock
  const selectedPapersInfo = selectedPapers.map((p) => ({
    id: p.id,
    fileName: p.fileName,
  }));

  return (
    <div className='flex h-[calc(100vh-56px)] bg-white'>
      <FolderSidebar
        folders={folders}
        selectedView={selectedView}
        foldersExpanded={foldersExpanded}
        isLoadingFolders={isLoadingFolders}
        onSelectView={handleViewChange}
        onToggleFolders={() => setFoldersExpanded(!foldersExpanded)}
        onCreateFolder={openCreateDialog}
        onEditFolder={openEditDialog}
        onDeleteFolder={openDeleteDialog}
      />
      {/* Main Content */}
      <main className='flex-1 flex flex-col overflow-hidden'>
        <header className='flex items-center justify-between px-6 py-4 border-b'>
          <div className='flex items-center gap-4'>
            <h2 className='text-xl font-semibold text-gray-900'>
              My Library - {currentViewName}
            </h2>
            {selectedPapers.length > 0 && (
              <span className='px-2 py-1 text-sm bg-orange-100 text-orange-700 rounded-full'>
                {selectedPapers.length} selected
              </span>
            )}
          </div>
          {selectedView !== 'notebooks' && (
            <Button
              onClick={upload.handleUploadClick}
              className='gap-2'
            >
              <Upload className='h-4 w-4' />
              Upload PDFs
            </Button>
          )}
          <input
            ref={upload.uploadInputRef}
            type='file'
            accept='application/pdf'
            multiple
            className='hidden'
            onChange={(e) => upload.onFilesSelected(e.target.files)}
          />
        </header>

        <div className='flex-1 overflow-auto'>
          {selectedView === 'notebooks' ? (
            <NotebookListTable />
          ) : (
            <PaperTable
              papers={displayPapers}
              totalPapers={displayPapers.length}
              isLoading={
                isInFolderView ? isLoadingFolderPapers : isLoadingAllPapers
              }
              onPaperClick={paperActions.handlePaperClick}
              onMovePaper={paperActions.openMovePaperDialog}
              onDeletePaper={paperActions.openDeletePaperDialog}
              onUploadClick={upload.handleUploadClick}
              selectable
              selectedPaperIds={selectedPaperIds}
              onToggleSelect={togglePaper}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onLoadMore={isInFolderView ? undefined : () => fetchNextPage()}
              hasMore={isInFolderView ? false : (hasNextPage ?? false)}
              isLoadingMore={isInFolderView ? false : isFetchingNextPage}
              groupPaperIds={groupPaperIds}
            />
          )}
        </div>
      </main>

      {/* Multi-Paper Chat Dock */}
      <ChatDock
        mode='multi'
        messages={multiChatMessages}
        onSend={(text) => sendMultiMessage(text)}
        onClearChatHistory={handleClearMultiChatHistory}
        conversationId={multiChatConversationId ?? undefined}
        isLoading={isMultiChatLoading}
        defaultOpen={false}
        selectedPapers={selectedPapersInfo}
        onRemovePaper={deselectPaper}
        showQuickActions={false}
        showSuggestions={true}
        onLoadMore={() => fetchMoreMultiMessages()}
        hasMore={hasMoreMultiMessages}
        isLoadingMore={isFetchingMoreMultiMessages}
      />

      {/* Folder Dialogs */}
      <CreateFolderDialog
        open={showCreateDialog}
        folderName={folderName}
        isCreating={createFolderMutation.isPending}
        onOpenChange={setShowCreateDialog}
        onFolderNameChange={setFolderName}
        onCreate={handleCreateFolder}
      />

      <EditFolderDialog
        open={showEditDialog}
        folderName={folderName}
        onOpenChange={setShowEditDialog}
        onFolderNameChange={setFolderName}
        onSave={handleEditFolder}
      />

      <DeleteFolderDialog
        open={showDeleteDialog}
        folder={deletingFolder}
        isDeleting={deleteFolderMutation.isPending}
        onOpenChange={setShowDeleteDialog}
        onDelete={handleDeleteFolder}
      />

      {/* Folder Select Modal (for "All files" upload) */}
      <FolderSelectModal
        open={upload.showFolderModal}
        fileNames={upload.pendingFileNames}
        isProcessing={upload.isUploading}
        onClose={upload.closeFolderModal}
        onConfirm={upload.handleFolderConfirmAndUpload}
        onRemoveFile={upload.removePendingFile}
      />

      <MovePaperDialog
        open={paperActions.showMovePaperDialog}
        paper={paperActions.movingPaper}
        folders={folders}
        targetFolderId={paperActions.targetFolderId}
        isMoving={paperActions.isMovingPaper}
        onOpenChange={paperActions.setShowMovePaperDialog}
        onTargetFolderChange={paperActions.setTargetFolderId}
        onMove={paperActions.handleMovePaper}
      />

      {/* Paper Dialogs */}
      <DeletePaperDialog
        open={paperActions.showDeletePaperDialog}
        paper={paperActions.deletingPaper}
        isDeleting={paperActions.isDeletingPaper}
        onOpenChange={paperActions.setShowDeletePaperDialog}
        onDelete={paperActions.handleDeletePaper}
      />

      {/* Loading Overlay */}
      {paperActions.isNavigating && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg'>
            <Loader2 className='h-6 w-6 animate-spin text-blue-600' />
            <span className='text-gray-700'>Opening paper...</span>
          </div>
        </div>
      )}

      {/* Clear Chat History Confirm Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title='Clear Chat History?'
        message='This will permanently delete all messages in this multi-paper conversation. This action cannot be undone.'
        confirmLabel='Clear History'
        cancelLabel='Cancel'
        variant='danger'
        icon={Trash2}
        onConfirm={confirmClearMultiChatHistory}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
