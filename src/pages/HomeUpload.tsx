// src/pages/HomeUpload.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FileDropzone from '../components/uploader/FileDropzone';
import { FolderSelectModal } from '../components/uploader/FolderSelectModal';
import { startSession, uploadPdf, guestUploadPdf } from '../services';
import { usePaperStore } from '../store/usePaperStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore, generateGuestSessionId } from '../store/useGuestStore';
import { paperKeys } from '../hooks/queries';

export default function HomeUpload() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Use new API from usePaperStore
  const setCurrentPaper = usePaperStore((s) => s.setCurrentPaper);
  const setSession = usePaperStore((s) => s.setSession);

  // Guest store
  const setGuestPaper = useGuestStore((s) => s.setGuestPaper);
  const setGuestSession = useGuestStore((s) => s.setGuestSession);

  // State for folder selection modal (logged-in users)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    setProgress: (v: number) => void;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Process upload for logged-in user (after folder selection)
   */
  const processAuthenticatedUpload = async (
    file: File,
    setProgress: (v: number) => void,
    folderId: string | null,
  ) => {
    setIsUploading(true);
    try {
      const { paper, localUrl } = await uploadPdf(
        file,
        setProgress,
        folderId || undefined,
      );
      console.log('HomeUpload - uploaded paper:', paper);

      // Store paper with local URL for PDF preview
      const paperWithLocalUrl = { ...paper, localUrl };
      setCurrentPaper(paperWithLocalUrl);

      // Invalidate papers cache to refresh list
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });

      // Create a new conversation/session for this paper
      const { conversationId } = await startSession(paper.id, paper.ragFileId);
      console.log('HomeUpload - created session:', conversationId);

      setSession({
        id: conversationId,
        paperId: paper.id,
        ragFileId: paper.ragFileId,
        messages: [],
      });

      setShowFolderModal(false);
      setPendingFile(null);
      nav(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Process upload for guest user (no folder, persisted to localStorage)
   * Navigates to chat immediately, ingest runs in background
   */
  const processGuestUpload = async (
    file: File,
    setProgress: (v: number) => void,
  ) => {
    setIsUploading(true);
    try {
      const { guestPaper } = await guestUploadPdf(file, setProgress);
      console.log('HomeUpload - guest upload:', guestPaper);

      // Create guest paper object with status from backend
      const guestPaperObj = {
        id: guestPaper.paperId,
        ragFileId: guestPaper.ragFileId,
        fileName: guestPaper.fileName,
        fileUrl: guestPaper.fileUrl,
        status: guestPaper.status, // PROCESSING or COMPLETED
        createdAt: new Date().toISOString(),
      };

      // Store in guest store (persisted to localStorage)
      setGuestPaper(guestPaperObj);

      // Create guest session
      const guestSessionId = generateGuestSessionId();
      setGuestSession({
        id: guestSessionId,
        paperId: guestPaperObj.id,
        ragFileId: guestPaperObj.ragFileId,
        messages: [],
        createdAt: new Date().toISOString(),
      });

      // Also set in paper store for PDF viewer compatibility
      setCurrentPaper({
        id: guestPaperObj.id,
        ragFileId: guestPaperObj.ragFileId,
        fileName: guestPaperObj.fileName,
        fileUrl: guestPaperObj.fileUrl,
        localUrl: guestPaperObj.fileUrl,
        status: guestPaperObj.status,
        createdAt: guestPaperObj.createdAt,
        updatedAt: guestPaperObj.createdAt,
        userId: '',
      } as any);

      setSession({
        id: guestSessionId,
        paperId: guestPaperObj.id,
        ragFileId: guestPaperObj.ragFileId,
        messages: [],
      });

      // Navigate to chat immediately (ingest runs in background)
      nav(`/chat/${guestSessionId}`);
    } catch (error) {
      console.error('Guest upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file upload
   */
  const onUpload = async (file: File, setProgress: (v: number) => void) => {
    if (isAuthenticated) {
      // Logged-in user: Show folder selection modal
      setPendingFile({ file, setProgress });
      setShowFolderModal(true);
    } else {
      // Guest user: Upload directly without folder
      await processGuestUpload(file, setProgress);
    }
  };

  /**
   * Handle folder selection confirm
   */
  const handleFolderConfirm = async (folderId: string | null) => {
    if (!pendingFile) return;
    await processAuthenticatedUpload(
      pendingFile.file,
      pendingFile.setProgress,
      folderId,
    );
  };

  /**
   * Handle folder modal close
   */
  const handleFolderModalClose = () => {
    if (!isUploading) {
      setShowFolderModal(false);
      setPendingFile(null);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-6'>
      <div className='max-w-3xl w-full'>
        <h1 className='text-3xl font-semibold text-center mb-6'>
          Chat with your Papers
        </h1>
        <p className='text-md text-center mb-6'>
          Upload any PDF to SciSpace Chat PDF, ask a question, and get concise,
          citation-linked answers, summaries, and follow-ups in seconds—free
          tier, 256-bit encrypted, no data training, supports 75 + languages.
        </p>
        <FileDropzone onUpload={onUpload} />
      </div>

      {/* Folder Selection Modal (for logged-in users) */}
      <FolderSelectModal
        open={showFolderModal}
        fileName={pendingFile?.file.name || ''}
        isUploading={isUploading}
        onClose={handleFolderModalClose}
        onConfirm={handleFolderConfirm}
      />
    </div>
  );
}
