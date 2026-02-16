import { create } from 'zustand';

type UiState = {
  isNotebooksOpen: boolean;
  openNotebooks: () => void;
  closeNotebooks: () => void;
  toggleNotebooks: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isNotebooksOpen: false,
  openNotebooks: () => set({ isNotebooksOpen: true }),
  closeNotebooks: () => set({ isNotebooksOpen: false }),
  toggleNotebooks: () => set((s) => ({ isNotebooksOpen: !s.isNotebooksOpen })),
}));
