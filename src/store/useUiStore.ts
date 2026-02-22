import { create } from 'zustand';

type UiState = {
  isNotebooksOpen: boolean;
  pendingNotebookId: string | null;
  openNotebooks: () => void;
  closeNotebooks: () => void;
  toggleNotebooks: () => void;
  setPendingNotebookId: (id: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isNotebooksOpen: false,
  pendingNotebookId: null,
  openNotebooks: () => set({ isNotebooksOpen: true }),
  closeNotebooks: () => set({ isNotebooksOpen: false }),
  toggleNotebooks: () => set((s) => ({ isNotebooksOpen: !s.isNotebooksOpen })),
  setPendingNotebookId: (id) => set({ pendingNotebookId: id }),
}));
