import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { validateFile } from '../../utils/file';
import { uploadPdf } from '../../services';
import { paperKeys, folderKeys } from '../queries';
import type { UploadItem } from '../../types/upload';

interface UseUploadOptions {
  onUploadComplete?: () => void;
  selectedView?: string;
  /**
   * When provided, files will be automatically assigned to this folder
   * without requiring folder selection (folder view context).
   */
  currentFolderId?: string;
  /**
   * Name of the current folder (for display in auto-assign mode)
   */
  currentFolderName?: string;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete, currentFolderId, currentFolderName } = options;
  const queryClient = useQueryClient();

  // Determine if we're in auto-assign mode (folder view context)
  const isAutoAssignMode = useMemo(() => !!currentFolderId, [currentFolderId]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Folder modal state (for "All files" view)
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingUploadItems, setPendingUploadItems] = useState<UploadItem[]>(
    [],
  );

  // Derived: file names for FolderSelectModal
  const pendingFileNames = useMemo(
    () => pendingUploadItems.map((item) => item.file.name),
    [pendingUploadItems],
  );

  const handleUploadClick = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

  // Core upload function — uploads items with an optional folderId
  const processUpload = useCallback(
    async (items: UploadItem[], folderId?: string) => {
      if (isUploading || items.length === 0) return;

      setIsUploading(true);

      for (const item of items) {
        try {
          await uploadPdf(item.file, undefined, folderId);
          toast.success(`Uploaded: ${item.file.name}`);
        } catch (err: any) {
          toast.error(`Failed to upload ${item.file.name}`);
        }
      }

      // Invalidate React Query caches to refetch data
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paperKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });

      setIsUploading(false);
      onUploadComplete?.();
    },
    [isUploading, queryClient, onUploadComplete],
  );

  // Handle file input change
  const onFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newItems: UploadItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { valid, errors } = validateFile(file);
        if (valid) {
          newItems.push({
            id: `${Date.now()}-${i}`,
            file,
            status: 'pending',
            progress: 0,
          });
        } else {
          toast.error(`${file.name}: ${errors.join(', ')}`);
        }
      }

      if (newItems.length > 0) {
        if (isAutoAssignMode && currentFolderId) {
          // In folder view → upload directly to current folder
          processUpload(newItems, currentFolderId);
        } else {
          // In "All files" view → show FolderSelectModal
          setPendingUploadItems(newItems);
          setShowFolderModal(true);
        }
      }

      // Reset file input
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    },
    [isAutoAssignMode, currentFolderId, processUpload],
  );

  // Called when user confirms folder in FolderSelectModal
  const handleFolderConfirmAndUpload = useCallback(
    async (folderId: string | null) => {
      setShowFolderModal(false);
      if (pendingUploadItems.length === 0) return;
      const items = [...pendingUploadItems];
      setPendingUploadItems([]);
      await processUpload(items, folderId ?? undefined);
    },
    [pendingUploadItems, processUpload],
  );

  // Remove a pending file by index (before upload)
  const removePendingFile = useCallback((index: number) => {
    setPendingUploadItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Close modal if no files left
      if (next.length === 0) {
        setShowFolderModal(false);
      }
      return next;
    });
  }, []);

  // Close folder modal
  const closeFolderModal = useCallback(() => {
    if (!isUploading) {
      setShowFolderModal(false);
      setPendingUploadItems([]);
    }
  }, [isUploading]);

  return {
    // State
    isUploading,
    uploadInputRef,

    // Auto-assign mode (folder view context)
    isAutoAssignMode,
    currentFolderName,

    // Folder modal state (for FolderSelectModal in "All files" view)
    showFolderModal,
    pendingFileNames,

    // Actions
    handleUploadClick,
    onFilesSelected,
    handleFolderConfirmAndUpload,
    removePendingFile,
    closeFolderModal,
  };
}
