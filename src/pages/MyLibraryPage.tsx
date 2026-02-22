import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
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
} from '../hooks';
import {
  PaperTable,
  UploadDialog,
  DeletePaperDialog,
} from '../components/library';
import ChatDock from '../components/chat/ChatDock';

export default function MyLibraryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

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

  // Upload hook (simplified, no folder context)
  const upload = useUpload({});

  // Paper actions hook
  const paperActions = usePaperActions({});

  // Fetch active sessions to identify group papers
  const { data: sessions = [] } = useSessions();
  const groupPaperIds = new Set(
    sessions
      .filter((s: any) => s.isCollaborative && s.paperId)
      .map((s: any) => s.paperId),
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Auto-refresh papers when there are processing papers
  useEffect(() => {
    if (!hasProcessingPapers) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: paperKeys.infinite() });
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [hasProcessingPapers, queryClient]);

  // Multi-select handlers
  const selectedPaperIds = selectedPapers.map((p) => p.id);

  const handleSelectAll = () => {
    allPapers.forEach((paper) => {
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
      {/* Main Content */}
      <main className='flex-1 flex flex-col overflow-hidden'>
        <header className='flex items-center justify-between px-6 py-4 border-b'>
          <div className='flex items-center gap-4'>
            <h2 className='text-xl font-semibold text-gray-900'>My Library</h2>
            {selectedPapers.length > 0 && (
              <span className='px-2 py-1 text-sm bg-orange-100 text-orange-700 rounded-full'>
                {selectedPapers.length} selected
              </span>
            )}
          </div>
          <Button
            onClick={upload.handleUploadClick}
            className='gap-2'
          >
            <Upload className='h-4 w-4' />
            Upload PDFs
          </Button>
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
          <PaperTable
            papers={allPapers}
            totalPapers={allPapers.length}
            isLoading={isLoadingAllPapers}
            onPaperClick={paperActions.handlePaperClick}
            onDeletePaper={paperActions.openDeletePaperDialog}
            onUploadClick={upload.handleUploadClick}
            selectable
            selectedPaperIds={selectedPaperIds}
            onToggleSelect={togglePaper}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onLoadMore={() => fetchNextPage()}
            hasMore={hasNextPage ?? false}
            isLoadingMore={isFetchingNextPage}
            groupPaperIds={groupPaperIds}
          />
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

      {/* Upload Dialog */}
      <UploadDialog
        open={upload.showUploadDialog}
        uploadQueue={upload.uploadQueue}
        isUploading={upload.isUploading}
        onOpenChange={upload.setShowUploadDialog}
        onRemoveFromQueue={upload.removeFromQueue}
        onUpload={upload.processUploadQueue}
        onClose={upload.closeUploadDialog}
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
