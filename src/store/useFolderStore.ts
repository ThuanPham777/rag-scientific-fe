// src/store/useFolderStore.ts
// REFACTORED: Now contains ONLY UI/client state
// Server data (folders, papers) is managed by React Query (useFolderQueries)
// This store only handles UI state like selected folder ID

import { create } from 'zustand';

type FolderUIState = {
  // UI state - selected folder ID for view
  selectedFolderId: string | null;

  // Actions
  selectFolder: (id: string | null) => void;
  clearSelectedFolder: () => void;
};

export const useFolderStore = create<FolderUIState>((set) => ({
  // Initial state
  selectedFolderId: null,

  // Actions
  selectFolder: (id) => set({ selectedFolderId: id }),
  clearSelectedFolder: () => set({ selectedFolderId: null }),
}));
