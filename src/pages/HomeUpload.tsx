import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileDropzone from '../components/uploader/FileDropzone';
import { startSession, uploadPdf } from '../services/api';
import { usePaperStore } from '../store/usePaperStore';
import { useAuthStore } from '../store/useAuthStore';
import AuthModal from '../components/auth/AuthModal';

export default function HomeUpload() {
  const nav = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const setPaper = usePaperStore((s) => s.setPaper);
  const addPaper = usePaperStore((s) => s.addPaper);
  const setSession = usePaperStore((s) => s.setSession);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    setProgress: (v: number) => void;
  } | null>(null);

  const processUpload = async (
    file: File,
    setProgress: (v: number) => void,
  ) => {
    const { paper, localUrl } = await uploadPdf(file, setProgress);
    console.log('HomeUpload - uploaded paper:', paper);

    // Store paper with local URL for PDF preview
    const paperWithLocalUrl = { ...paper, localUrl };
    setPaper(paperWithLocalUrl);
    addPaper(paperWithLocalUrl);

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
  };

  const onUpload = async (file: File, setProgress: (v: number) => void) => {
    // Check auth - if not authenticated, show login modal
    if (!isAuthenticated) {
      setPendingFile({ file, setProgress });
      setShowAuthModal(true);
      return;
    }

    await processUpload(file, setProgress);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    // If user logged in and we have a pending file, process it
    if (isAuthenticated && pendingFile) {
      processUpload(pendingFile.file, pendingFile.setProgress);
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        initialMode='login'
      />
    </div>
  );
}
