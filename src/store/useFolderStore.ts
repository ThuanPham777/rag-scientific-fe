import { create } from 'zustand';
import type { Folder, FolderWithPapers, Paper } from '../utils/types';
import * as folderApi from '../services/api/folder.api';
import { toast } from 'sonner';

type FolderState = {
  // Data
  folders: Folder[];
  selectedFolder: FolderWithPapers | null;
  uncategorizedPapers: Paper[];

  // Loading states
  isLoadingFolders: boolean;
  isLoadingPapers: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isMoving: boolean;

  // Actions
  fetchFolders: () => Promise<void>;
  fetchFolder: (id: string) => Promise<void>;
  fetchUncategorized: () => Promise<void>;
  createFolder: (data: { name: string }) => Promise<Folder | null>;
  updateFolder: (id: string, data: { name?: string }) => Promise<Folder | null>;
  deleteFolder: (id: string) => Promise<boolean>;
  movePaper: (paperId: string, folderId: string | null) => Promise<boolean>;
  clearSelectedFolder: () => void;
};

export const useFolderStore = create<FolderState>((set, get) => ({
  // Initial state
  folders: [],
  selectedFolder: null,
  uncategorizedPapers: [],
  isLoadingFolders: false,
  isLoadingPapers: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isMoving: false,

  fetchFolders: async () => {
    set({ isLoadingFolders: true });
    try {
      const res = await folderApi.getFolders();
      if (res.success) {
        set({ folders: res.data });
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      toast.error('Failed to load folders');
    } finally {
      set({ isLoadingFolders: false });
    }
  },

  fetchFolder: async (id: string) => {
    set({ isLoadingPapers: true });
    try {
      const res = await folderApi.getFolder(id);
      if (res.success) {
        set({ selectedFolder: res.data });
      }
    } catch (err) {
      console.error('Failed to fetch folder:', err);
      toast.error('Failed to load folder');
    } finally {
      set({ isLoadingPapers: false });
    }
  },

  fetchUncategorized: async () => {
    set({ isLoadingPapers: true });
    try {
      const res = await folderApi.getUncategorizedPapers();
      if (res.success) {
        set({ uncategorizedPapers: res.data });
      }
    } catch (err) {
      console.error('Failed to fetch uncategorized papers:', err);
      toast.error('Failed to load papers');
    } finally {
      set({ isLoadingPapers: false });
    }
  },

  createFolder: async (data) => {
    set({ isCreating: true });
    try {
      const res = await folderApi.createFolder(data);
      if (res.success) {
        set((state) => ({
          folders: [...state.folders, res.data],
        }));
        toast.success('Folder created');
        return res.data;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to create folder:', err);
      const msg = err.response?.data?.message || 'Failed to create folder';
      toast.error(msg);
      return null;
    } finally {
      set({ isCreating: false });
    }
  },

  updateFolder: async (id, data) => {
    set({ isUpdating: true });
    try {
      const res = await folderApi.updateFolder(id, data);
      if (res.success) {
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? res.data : f)),
          selectedFolder:
            state.selectedFolder?.id === id
              ? { ...state.selectedFolder, ...res.data }
              : state.selectedFolder,
        }));
        toast.success('Folder updated');
        return res.data;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to update folder:', err);
      const msg = err.response?.data?.message || 'Failed to update folder';
      toast.error(msg);
      return null;
    } finally {
      set({ isUpdating: false });
    }
  },

  deleteFolder: async (id) => {
    set({ isDeleting: true });
    try {
      const res = await folderApi.deleteFolder(id);
      if (res.success) {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          selectedFolder:
            state.selectedFolder?.id === id ? null : state.selectedFolder,
        }));
        toast.success('Folder deleted');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to delete folder:', err);
      const msg = err.response?.data?.message || 'Failed to delete folder';
      toast.error(msg);
      return false;
    } finally {
      set({ isDeleting: false });
    }
  },

  movePaper: async (paperId, folderId) => {
    set({ isMoving: true });
    try {
      const res = await folderApi.movePaperToFolder(paperId, folderId);
      if (res.success) {
        // Update local state - refresh both folder and uncategorized
        const state = get();

        // If we have a selected folder, refresh it
        if (state.selectedFolder) {
          await get().fetchFolder(state.selectedFolder.id);
        }

        // Refresh uncategorized
        await get().fetchUncategorized();

        // Refresh folders to update counts
        await get().fetchFolders();

        toast.success(
          folderId ? 'Paper moved to folder' : 'Paper removed from folder',
        );
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to move paper:', err);
      const msg = err.response?.data?.message || 'Failed to move paper';
      toast.error(msg);
      return false;
    } finally {
      set({ isMoving: false });
    }
  },

  clearSelectedFolder: () => {
    set({ selectedFolder: null });
  },
}));
