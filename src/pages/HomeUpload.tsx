// src/pages/HomeUpload.tsx
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FileDropzone from '../components/uploader/FileDropzone';
import { startSession, uploadPdf, guestUploadPdf } from '../services';
import { usePaperStore } from '../store/usePaperStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore, generateGuestSessionId } from '../store/useGuestStore';
import { useGuestLimitStore } from '../store/useGuestLimitStore';
import AuthModal from '@/components/auth/AuthModal';
import { paperKeys } from '../hooks/queries';
import { FolderSelectModal } from '@/components/uploader/FolderSelectModal';
import { useState, useRef } from 'react';
import { Lock } from 'lucide-react';

type AuthMode = 'login' | 'signup';

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

  // Guest upload limit — reactive so UI re-renders when limit is reached
  const guestUploadLimitReached = useGuestLimitStore(
    (s) => !isAuthenticated && s.uploadsUsed >= 1,
  );

  // Auth modal for guest limit exceeded
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Ref tracks whether a guest upload is in progress.
  // A ref (not state) is used so the value is updated synchronously BEFORE
  // tryUseUpload() triggers a Zustand re-render, preventing the limit card
  // from flashing during the upload→navigate flow.
  const guestUploadingRef = useRef(false);
  const [, forceRender] = useState(0);

  // State for folder selection modal (logged-in users)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    setProgress: (v: number) => void;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Process upload for logged-in user
   */
  const processAuthenticatedUpload = async (
    file: File,
    setProgress: (v: number) => void,
    folderId: string | null = null,
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

      // Invalidate papers cache to refresh list (use paperKeys.all to invalidate all paper queries)
      queryClient.invalidateQueries({ queryKey: paperKeys.all });

      // Create a new conversation/session for this paper
      const { conversationId } = await startSession(paper.id, paper.ragFileId);
      console.log('HomeUpload - created session:', conversationId);

      setSession({
        id: conversationId,
        paperId: paper.id,
        ragFileId: paper.ragFileId,
        messages: [],
      });

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
    try {
      const { guestPaper, localUrl } = await guestUploadPdf(file, setProgress);
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
        localUrl: localUrl, // Use blob URL for PDF preview (avoids CORS)
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
      // Check upload limit (1 per session)
      if (!useGuestLimitStore.getState().canUpload()) {
        // Limit already reached — force re-render to show card
        forceRender((n) => n + 1);
        return;
      }
      // Set ref synchronously BEFORE incrementing the counter so the
      // Zustand-triggered re-render still sees guestUploadingRef.current === true
      guestUploadingRef.current = true;
      useGuestLimitStore.getState().tryUseUpload();
      try {
        await processGuestUpload(file, setProgress);
      } finally {
        guestUploadingRef.current = false;
      }
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
          AskPdf – Your Intelligent Research Companion
        </h1>
        <p className='text-md text-center mb-6'>
          AskPdf enables you to interact with academic papers and documents
          through natural language. Simply upload a PDF and engage in a smart,
          context-aware conversation powered by AI. From quick explanations and
          structured summaries to deep-dive analysis and collaborative
          discussion, AskPdf turns static documents into dynamic knowledge
          experiences.
        </p>
        {/* Show limit-reached card or normal dropzone.
            Suppress the card while a guest upload is actively in progress
            to prevent a flash before navigation. */}
        {guestUploadLimitReached && !guestUploadingRef.current ? (
          <div className='rounded-xl border border-gray-200 bg-gray-50 p-10 flex flex-col items-center justify-center text-center'>
            <Lock
              size={48}
              className='text-gray-400 mb-4'
            />
            <p className='text-gray-600 text-base mb-6'>
              Upload Limit reached. Signup / Login to get unlimited chats.
            </p>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setShowGuestAuthModal(true);
                }}
                className='px-5 py-2 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600 transition'
              >
                Sign up
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowGuestAuthModal(true);
                }}
                className='px-5 py-2 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition'
              >
                Log in
              </button>
            </div>
          </div>
        ) : (
          <FileDropzone onUpload={onUpload} />
        )}
      </div>

      {/* Auth Modal — opened from limit-reached card */}
      <AuthModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        initialMode={authMode}
      />

      {/* Folder Selection Modal (for logged-in users only) */}
      {isAuthenticated && (
        <FolderSelectModal
          open={showFolderModal}
          fileNames={pendingFile ? [pendingFile.file.name] : []}
          isProcessing={isUploading}
          onClose={handleFolderModalClose}
          onConfirm={handleFolderConfirm}
        />
      )}
    </div>
  );
}
