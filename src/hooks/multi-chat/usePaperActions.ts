import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePaperStore } from '../../store/usePaperStore';
import { useDeletePaper, useMovePaper } from '../queries';
import type { Paper } from '../../utils/types';

interface UsePaperActionsOptions {
  onActionComplete?: () => void;
}

export function usePaperActions(options: UsePaperActionsOptions = {}) {
  const { onActionComplete } = options;
  const navigate = useNavigate();

  // Use new API from usePaperStore
  const setCurrentPaper = usePaperStore((s) => s.setCurrentPaper);
  const setSession = usePaperStore((s) => s.setSession);

  // React Query mutations
  const deletePaperMutation = useDeletePaper();
  const movePaperMutation = useMovePaper();

  // Delete paper state
  const [showDeletePaperDialog, setShowDeletePaperDialog] = useState(false);
  const [deletingPaper, setDeletingPaper] = useState<Paper | null>(null);

  // Move paper state
  const [showMovePaperDialog, setShowMovePaperDialog] = useState(false);
  const [movingPaper, setMovingPaper] = useState<Paper | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');

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
    try {
      await deletePaperMutation.mutateAsync(deletingPaper.id);
      setShowDeletePaperDialog(false);
      setDeletingPaper(null);
      onActionComplete?.();
    } catch {
      // Error handled by mutation
    }
  }, [deletingPaper, deletePaperMutation, onActionComplete]);

  const handleMovePaper = useCallback(async () => {
    if (!movingPaper || !targetFolderId) return;
    try {
      await movePaperMutation.mutateAsync({
        paperId: movingPaper.id,
        folderId: targetFolderId === 'none' ? null : targetFolderId,
      });
      setShowMovePaperDialog(false);
      setMovingPaper(null);
      setTargetFolderId('');
      onActionComplete?.();
    } catch {
      // Error handled by mutation
    }
  }, [movingPaper, targetFolderId, movePaperMutation, onActionComplete]);

  const handlePaperClick = useCallback(
    async (paper: Paper) => {
      setIsNavigating(true);

      try {
        // Use direct API call for navigation flow
        const { listConversations, startSession } = await import('../../services');
        const convResponse = await listConversations(paper.id);

        if (convResponse.success && convResponse.data.length > 0) {
          const latestConv = convResponse.data[0];
          setCurrentPaper(paper);
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
          setCurrentPaper(paper);
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
    [navigate, setCurrentPaper, setSession],
  );

  return {
    // Delete paper state
    showDeletePaperDialog,
    setShowDeletePaperDialog,
    deletingPaper,
    isDeletingPaper: deletePaperMutation.isPending,

    // Move paper state
    showMovePaperDialog,
    setShowMovePaperDialog,
    movingPaper,
    targetFolderId,
    setTargetFolderId,
    isMovingPaper: movePaperMutation.isPending,

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
