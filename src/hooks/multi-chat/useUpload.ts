import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { validateFile } from '../../utils/file';
import { uploadPdf } from '../../services';
import { useCreateFolder, paperKeys, folderKeys } from '../queries';
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
  const {
    onUploadComplete,
    selectedView = 'all',
    currentFolderId,
    currentFolderName,
  } = options;
  const queryClient = useQueryClient();

  // Determine if we're in auto-assign mode (folder view context)
  const isAutoAssignMode = useMemo(() => !!currentFolderId, [currentFolderId]);

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);

  // React Query mutation for folder creation
  const createFolderMutation = useCreateFolder();

  const handleUploadClick = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

  // Helper function to process upload directly without dialog
  const processDirectUpload = useCallback(
    async (items: UploadItem[], folderId: string) => {
      if (isUploading || items.length === 0) return;

      setUploadQueue(items);
      setIsUploading(true);

      for (const item of items) {
        // Update status to uploading
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'uploading' } : q,
          ),
        );

        try {
          await uploadPdf(
            item.file,
            (progress) => {
              setUploadQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress } : q)),
              );
            },
            folderId,
          );

          // Success
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'done', progress: 100 } : q,
            ),
          );
          toast.success(`Uploaded: ${item.file.name}`);
        } catch (err: any) {
          // Error
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'error',
                    error: err.message || 'Upload failed',
                  }
                : q,
            ),
          );
          toast.error(`Failed to upload ${item.file.name}`);
        }
      }

      // Invalidate React Query caches to refetch data
      queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });

      setIsUploading(false);
      setUploadQueue([]);
      onUploadComplete?.();
    },
    [isUploading, queryClient, onUploadComplete],
  );

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
        // In auto-assign mode (folder view), upload directly without dialog
        if (isAutoAssignMode && currentFolderId) {
          processDirectUpload(newItems, currentFolderId);
        } else {
          // Show dialog for folder selection
          setUploadQueue(newItems);
          if (selectedView !== 'all') {
            // Pre-select the current folder from sidebar
            setUploadFolderId(selectedView);
          } else {
            setUploadFolderId('');
          }
          setShowUploadDialog(true);
        }
      }
      // Reset input
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    },
    [selectedView, isAutoAssignMode, currentFolderId, processDirectUpload],
  );

  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const processUploadQueue = useCallback(async () => {
    if (isUploading || uploadQueue.length === 0) return;

    setIsUploading(true);
    const pendingItems = uploadQueue.filter(
      (item) => item.status === 'pending',
    );

    for (const item of pendingItems) {
      // Update status to uploading
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q)),
      );

      try {
        await uploadPdf(
          item.file,
          (progress) => {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress } : q)),
            );
          },
          uploadFolderId || undefined,
        );

        // Success
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'done', progress: 100 } : q,
          ),
        );
      } catch (err: any) {
        // Error
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', error: err.message || 'Upload failed' }
              : q,
          ),
        );
      }
    }

    // Invalidate React Query caches to refetch data
    queryClient.invalidateQueries({ queryKey: paperKeys.lists() });
    queryClient.invalidateQueries({ queryKey: folderKeys.all });

    setIsUploading(false);
    onUploadComplete?.();
  }, [isUploading, uploadQueue, uploadFolderId, queryClient, onUploadComplete]);

  const closeUploadDialog = useCallback(() => {
    if (isUploading) return;
    setShowUploadDialog(false);
    setUploadQueue([]);
    setUploadFolderId('');
    setShowNewFolderInput(false);
    setNewFolderName('');
  }, [isUploading]);

  const handleCreateFolderInUpload = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      const result = await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
      });
      if (result.data) {
        setUploadFolderId(result.data.id);
        setShowNewFolderInput(false);
        setNewFolderName('');
      }
    } catch {
      // Error handled by mutation
    }
  }, [newFolderName, createFolderMutation]);

  return {
    // State
    uploadQueue,
    isUploading,
    showUploadDialog,
    uploadFolderId,
    showNewFolderInput,
    newFolderName,
    isCreating: createFolderMutation.isPending,
    uploadInputRef,

    // Auto-assign mode (folder view context)
    isAutoAssignMode,
    currentFolderName,

    // Setters
    setUploadFolderId,
    setShowNewFolderInput,
    setNewFolderName,
    setShowUploadDialog,

    // Actions
    handleUploadClick,
    onFilesSelected,
    removeFromQueue,
    processUploadQueue,
    closeUploadDialog,
    handleCreateFolderInUpload,
  };
}
