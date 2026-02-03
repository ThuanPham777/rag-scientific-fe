import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import { useFolderStore } from '../store/useFolderStore';
import { useAuthStore } from '../store/useAuthStore';
import { useMultiPaperChatStore } from '../store/useMultiPaperChatStore';
import { listPapers } from '../services';
import { Button } from '../components/ui/button';
import type { Paper, Folder as FolderType } from '../utils/types';
import { useUpload } from '../hooks/useUpload';
import { usePaperActions } from '../hooks/usePaperActions';
import { useMultiPaperChat } from '../hooks/useMultiPaperChat';
import {
  FolderSidebar,
  PaperTable,
  UploadDialog,
  CreateFolderDialog,
  EditFolderDialog,
  DeleteFolderDialog,
  DeletePaperDialog,
  MovePaperDialog,
} from '../components/library';
import ChatDock from '../components/chat/ChatDock';

export default function MyLibraryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    folders,
    selectedFolder,
    isLoadingFolders,
    isLoadingPapers,
    isCreating,
    isDeleting,
    fetchFolders,
    fetchFolder,
    fetchUncategorized,
    createFolder,
    updateFolder,
    deleteFolder,
    clearSelectedFolder,
  } = useFolderStore();

  // Multi-paper chat state
  const { selectedPapers, togglePaper, deselectPaper, clearSelection } =
    useMultiPaperChatStore();

  const {
    messages: multiChatMessages,
    isLoading: isMultiChatLoading,
    sendMessage: sendMultiMessage,
  } = useMultiPaperChat();

  // All papers state
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [isLoadingAllPapers, setIsLoadingAllPapers] = useState(false);

  // View state
  const [selectedView, setSelectedView] = useState<'all' | string>('all');
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  // Folder dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [folderName, setFolderName] = useState('');

  // Fetch all papers
  const fetchAllPapers = async () => {
    setIsLoadingAllPapers(true);
    try {
      const res = await listPapers();
      if (res.success) {
        setAllPapers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setIsLoadingAllPapers(false);
    }
  };

  // Upload hook
  const upload = useUpload({
    onUploadComplete: fetchAllPapers,
    selectedView,
  });

  // Paper actions hook
  const paperActions = usePaperActions({
    onActionComplete: fetchAllPapers,
    selectedView,
    fetchFolder,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchFolders();
      fetchUncategorized();
      fetchAllPapers();
    }
  }, [isAuthenticated]);

  // Fetch folder when selected
  useEffect(() => {
    if (selectedView !== 'all') {
      fetchFolder(selectedView);
    } else {
      clearSelectedFolder();
    }
  }, [selectedView]);

  // Folder handlers
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const result = await createFolder({ name: folderName.trim() });
    if (result) {
      setShowCreateDialog(false);
      setFolderName('');
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !folderName.trim()) return;
    const result = await updateFolder(editingFolder.id, {
      name: folderName.trim(),
    });
    if (result) {
      setShowEditDialog(false);
      setEditingFolder(null);
      setFolderName('');
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    const success = await deleteFolder(deletingFolder.id);
    if (success) {
      setShowDeleteDialog(false);
      setDeletingFolder(null);
      if (selectedView === deletingFolder.id) {
        setSelectedView('all');
      }
      fetchAllPapers();
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

  // Determine what papers to show
  const displayPapers: Paper[] =
    selectedView === 'all' ? allPapers : selectedFolder?.papers || [];

  const currentViewName =
    selectedView === 'all' ? 'All files' : selectedFolder?.name || 'Loading...';

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
      {/* Left Sidebar */}
      <FolderSidebar
        folders={folders}
        selectedView={selectedView}
        foldersExpanded={foldersExpanded}
        isLoadingFolders={isLoadingFolders}
        onSelectView={setSelectedView}
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
            papers={displayPapers}
            totalPapers={allPapers.length}
            isLoading={isLoadingAllPapers || isLoadingPapers}
            onPaperClick={paperActions.handlePaperClick}
            onMovePaper={paperActions.openMovePaperDialog}
            onDeletePaper={paperActions.openDeletePaperDialog}
            onUploadClick={upload.handleUploadClick}
            selectable
            selectedPaperIds={selectedPaperIds}
            onToggleSelect={togglePaper}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        </div>
      </main>

      {/* Multi-Paper Chat Dock */}
      <ChatDock
        mode='multi'
        messages={multiChatMessages}
        onSend={(text) => sendMultiMessage(text)}
        isLoading={isMultiChatLoading}
        defaultOpen={false}
        selectedPapers={selectedPapersInfo}
        onRemovePaper={deselectPaper}
        showQuickActions={false}
        showSuggestions={true}
      />

      {/* Folder Dialogs */}
      <CreateFolderDialog
        open={showCreateDialog}
        folderName={folderName}
        isCreating={isCreating}
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
        isDeleting={isDeleting}
        onOpenChange={setShowDeleteDialog}
        onDelete={handleDeleteFolder}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={upload.showUploadDialog}
        folders={folders}
        uploadQueue={upload.uploadQueue}
        uploadFolderId={upload.uploadFolderId}
        isUploading={upload.isUploading}
        isCreating={upload.isCreating}
        showNewFolderInput={upload.showNewFolderInput}
        newFolderName={upload.newFolderName}
        onOpenChange={upload.setShowUploadDialog}
        onFolderSelect={upload.setUploadFolderId}
        onRemoveFromQueue={upload.removeFromQueue}
        onUpload={upload.processUploadQueue}
        onClose={upload.closeUploadDialog}
        onShowNewFolderInput={upload.setShowNewFolderInput}
        onNewFolderNameChange={upload.setNewFolderName}
        onCreateFolder={upload.handleCreateFolderInUpload}
      />

      {/* Paper Dialogs */}
      <DeletePaperDialog
        open={paperActions.showDeletePaperDialog}
        paper={paperActions.deletingPaper}
        isDeleting={paperActions.isDeletingPaper}
        onOpenChange={paperActions.setShowDeletePaperDialog}
        onDelete={paperActions.handleDeletePaper}
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

      {/* Loading Overlay */}
      {paperActions.isNavigating && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg'>
            <Loader2 className='h-6 w-6 animate-spin text-blue-600' />
            <span className='text-gray-700'>Opening paper...</span>
          </div>
        </div>
      )}
    </div>
  );
}
