import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePaperStore } from '../../store/usePaperStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useDeletePaper } from '../queries';
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
  const setCollaborative = useSessionStore((s) => s.setCollaborative);

  // React Query mutations
  const deletePaperMutation = useDeletePaper();

  // Delete paper state
  const [showDeletePaperDialog, setShowDeletePaperDialog] = useState(false);
  const [deletingPaper, setDeletingPaper] = useState<Paper | null>(null);

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

  const handlePaperClick = useCallback(
    async (paper: Paper) => {
      setIsNavigating(true);

      try {
        // Use direct API call for navigation flow
        const { listConversations, startSession } =
          await import('../../services');
        const convResponse = await listConversations(paper.id);

        if (convResponse.success && convResponse.data.length > 0) {
          // Prioritize GROUP (collaborative) conversations over SINGLE_PAPER
          const groupConv = convResponse.data.find(
            (c: any) => c.type === 'GROUP',
          );
          const latestConv = groupConv || convResponse.data[0];

          setCurrentPaper(paper);
          setSession({
            id: latestConv.id,
            paperId: paper.id,
            ragFileId: paper.ragFileId,
            title: latestConv.title,
            messages: [],
          });

          // Set collaborative mode if GROUP conversation
          if (groupConv) {
            setCollaborative(true);
          } else {
            setCollaborative(false);
          }

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

    // Navigation state
    isNavigating,

    // Actions
    openDeletePaperDialog,
    handleDeletePaper,
    handlePaperClick,
  };
}
