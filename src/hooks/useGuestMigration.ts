// src/hooks/useGuestMigration.ts
// Hook to handle guest → authenticated user data migration.
// Called after login/signup when guest data exists in localStorage.

import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGuestStore, hasGuestData } from '../store/useGuestStore';
import { usePaperStore } from '../store/usePaperStore';
import { guestMigrateData } from '../services/api/guest.api';
import { paperKeys } from './queries';
import type { GuestMigratePayload } from '../services/api/guest.api';
import type { ChatMessage } from '../utils/types';

/**
 * Build the migration payload from current guest store state.
 * Converts ChatMessage[] to the API format.
 */
function buildMigratePayload(): GuestMigratePayload | null {
  const { currentPaper, currentSession, suggestions } =
    useGuestStore.getState();

  if (!currentPaper || !currentSession) return null;

  // Filter out messages with empty content (would fail backend validation)
  const messages = currentSession.messages
    .filter((msg: ChatMessage) => msg.content && msg.content.trim())
    .map((msg: ChatMessage) => ({
      role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: msg.content,
      imageUrl: msg.imageUrl || msg.imageDataUrl || undefined,
      modelName: msg.modelName,
      tokenCount: msg.tokenCount,
      citations: msg.citations,
      createdAt: msg.createdAt,
    }));

  return {
    ragFileId: currentPaper.ragFileId,
    fileName: currentPaper.fileName,
    fileUrl: currentPaper.fileUrl,
    messages,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

export interface GuestMigrationResult {
  conversationId: string;
  paperId: string;
  pendingQuestion?: string; // Question from suggestion click
}

/**
 * Hook that provides a `migrateGuestData` function.
 * Should be called right after successful login/signup.
 *
 * Returns:
 * - `migrateGuestData()` — async function that migrates and returns the new conversation ID
 * - `hasPendingGuestData` — whether there is guest data to migrate
 */
export function useGuestMigration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMigrating = useRef(false);

  const setCurrentPaper = usePaperStore((s) => s.setCurrentPaper);
  const setSession = usePaperStore((s) => s.setSession);

  const hasPendingGuestData = hasGuestData();

  const migrateGuestData =
    useCallback(async (): Promise<GuestMigrationResult | null> => {
      // Prevent double migration
      if (isMigrating.current) return null;

      const payload = buildMigratePayload();
      if (!payload) return null;

      const { pendingAuthAction, currentPaper } = useGuestStore.getState();

      isMigrating.current = true;
      try {
        // Call backend migration endpoint
        const result = await guestMigrateData(payload);

        // Update paper store to point to the new DB-backed paper/conversation
        setCurrentPaper({
          id: result.paperId,
          ragFileId: payload.ragFileId,
          fileName: payload.fileName,
          fileUrl: payload.fileUrl,
          localUrl: currentPaper?.fileUrl || payload.fileUrl,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: '', // Will be filled by query
        } as any);

        setSession({
          id: result.conversationId,
          paperId: result.paperId,
          ragFileId: payload.ragFileId,
          title: payload.fileName.replace(/\.pdf$/i, ''),
          messages: [],
        });

        // Invalidate React Query caches so library/conversations refresh
        queryClient.invalidateQueries({ queryKey: paperKeys.all });

        // Determine pending question from auth action
        const pendingQuestion =
          pendingAuthAction?.type === 'suggestion'
            ? pendingAuthAction.question
            : undefined;

        // Clear guest data (this clears localStorage too)
        useGuestStore.getState().clearGuestData();

        // Navigate to the new authenticated conversation
        navigate(`/chat/${result.conversationId}`, { replace: true });

        return {
          conversationId: result.conversationId,
          paperId: result.paperId,
          pendingQuestion,
        };
      } catch (error: any) {
        console.error('Guest migration failed:', error);
        // Clear stale guest data on 4xx errors to prevent infinite retry
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) {
          console.warn('Clearing stale guest data due to', status, 'error');
          useGuestStore.getState().clearGuestData();
        }
        return null;
      } finally {
        isMigrating.current = false;
      }
    }, [navigate, queryClient, setCurrentPaper, setSession]);

  return {
    migrateGuestData,
    hasPendingGuestData,
  };
}
