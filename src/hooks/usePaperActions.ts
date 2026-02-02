import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  listConversations,
  startSession,
  deletePaper,
  movePaperToFolder,
} from '../services';
import { usePaperStore } from '../store/usePaperStore';
import type { Paper } from '../utils/types';

interface UsePaperActionsOptions {
  onActionComplete?: () => void;
  selectedView?: string;
  fetchFolder?: (id: string) => void;
}

export function usePaperActions(options: UsePaperActionsOptions = {}) {
  const { onActionComplete, selectedView = 'all', fetchFolder } = options;
  const navigate = useNavigate();
  const { setPaper, setSession } = usePaperStore();

  // Delete paper state
  const [showDeletePaperDialog, setShowDeletePaperDialog] = useState(false);
  const [deletingPaper, setDeletingPaper] = useState<Paper | null>(null);
  const [isDeletingPaper, setIsDeletingPaper] = useState(false);

  // Move paper state
  const [showMovePaperDialog, setShowMovePaperDialog] = useState(false);
  const [movingPaper, setMovingPaper] = useState<Paper | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [isMovingPaper, setIsMovingPaper] = useState(false);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);

  const openDeletePaperDialog = useCallback(
    (paper: Paper, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingPaper(paper);
      setShowDeletePaperDialog(true);
    },
    [],
  );

  const openMovePaperDialog = useCallback(
    (paper: Paper, e: React.MouseEvent) => {
      e.stopPropagation();
      setMovingPaper(paper);
      setTargetFolderId('');
      setShowMovePaperDialog(true);
    },
    [],
  );

  const handleDeletePaper = useCallback(async () => {
    if (!deletingPaper) return;
    setIsDeletingPaper(true);
    try {
      await deletePaper(deletingPaper.id);
      toast.success('Paper deleted');
      setShowDeletePaperDialog(false);
      setDeletingPaper(null);
      onActionComplete?.();
      if (selectedView !== 'all' && fetchFolder) {
        fetchFolder(selectedView);
      }
    } catch (err) {
      toast.error('Failed to delete paper');
    } finally {
      setIsDeletingPaper(false);
    }
  }, [deletingPaper, onActionComplete, selectedView, fetchFolder]);

  const handleMovePaper = useCallback(async () => {
    if (!movingPaper || !targetFolderId) return;
    setIsMovingPaper(true);
    try {
      await movePaperToFolder(
        movingPaper.id,
        targetFolderId === 'none' ? null : targetFolderId,
      );
      toast.success('Paper moved');
      setShowMovePaperDialog(false);
      setMovingPaper(null);
      setTargetFolderId('');
      onActionComplete?.();
      if (selectedView !== 'all' && fetchFolder) {
        fetchFolder(selectedView);
      }
    } catch (err) {
      toast.error('Failed to move paper');
    } finally {
      setIsMovingPaper(false);
    }
  }, [
    movingPaper,
    targetFolderId,
    onActionComplete,
    selectedView,
    fetchFolder,
  ]);

  const handlePaperClick = useCallback(
    async (paper: Paper) => {
      setIsNavigating(true);
      try {
        const convResponse = await listConversations(paper.id);

        if (convResponse.success && convResponse.data.length > 0) {
          const latestConv = convResponse.data[0];
          setPaper(paper);
          setSession({
            id: latestConv.id,
            paperId: paper.id,
            ragFileId: paper.ragFileId,
            title: latestConv.title,
            messages: [],
          });
          navigate(`/chat/${latestConv.id}`);
        } else {
          const { conversationId } = await startSession(
            paper.id,
            paper.ragFileId,
          );
          setPaper(paper);
          setSession({
            id: conversationId,
            paperId: paper.id,
            ragFileId: paper.ragFileId,
            messages: [],
          });
          navigate(`/chat/${conversationId}`);
        }
      } catch (err) {
        console.error('Failed to open paper:', err);
        toast.error('Failed to open paper');
      } finally {
        setIsNavigating(false);
      }
    },
    [navigate, setPaper, setSession],
  );

  return {
    // Delete paper state
    showDeletePaperDialog,
    setShowDeletePaperDialog,
    deletingPaper,
    isDeletingPaper,

    // Move paper state
    showMovePaperDialog,
    setShowMovePaperDialog,
    movingPaper,
    targetFolderId,
    setTargetFolderId,
    isMovingPaper,

    // Navigation state
    isNavigating,

    // Actions
    openDeletePaperDialog,
    openMovePaperDialog,
    handleDeletePaper,
    handleMovePaper,
    handlePaperClick,
  };
}
