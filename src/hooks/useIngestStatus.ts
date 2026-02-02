// src/hooks/useIngestStatus.ts
// Custom hook for polling ingest status for guest papers

import { useEffect } from 'react';
import { useGuestStore } from '../store/useGuestStore';
import { usePaperStore } from '../store/usePaperStore';
import { guestCheckIngestStatus } from '../services';

interface UseIngestStatusOptions {
  enabled: boolean;
}

/**
 * Hook to poll ingest status when guest paper is processing
 */
export function useIngestStatus({ enabled }: UseIngestStatusOptions) {
  const guestPaper = useGuestStore((s) => s.currentPaper);
  const updateGuestPaper = useGuestStore((s) => s.updateGuestPaper);

  useEffect(() => {
    if (!enabled || !guestPaper || guestPaper.status !== 'PROCESSING') return;

    const pollStatus = async () => {
      try {
        const { status } = await guestCheckIngestStatus(guestPaper.ragFileId);
        if (status !== 'PROCESSING') {
          updateGuestPaper({ status });
          // Also update paper store for compatibility
          usePaperStore.getState().updatePaper({ status } as any);
        }
      } catch (err) {
        console.error('Failed to check ingest status:', err);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Check immediately

    return () => clearInterval(interval);
  }, [enabled, guestPaper?.ragFileId, guestPaper?.status, updateGuestPaper]);
}
