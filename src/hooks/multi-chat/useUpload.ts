import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { validateFile } from '../../utils/file';
import { uploadPdf } from '../../services';
import { useCreateFolder, paperKeys, folderKeys } from '../queries';
import type { UploadItem } from '../../types/upload';

interface UseUploadOptions {
  onUploadComplete?: () => void;
  selectedView?: string;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete, selectedView = 'all' } = options;
  const queryClient = useQueryClient();

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
        setUploadQueue(newItems);
        // If already in a folder, pre-select it
        if (selectedView !== 'all') {
          setUploadFolderId(selectedView);
        } else {
          setUploadFolderId('');
        }
        setShowUploadDialog(true);
      }
      // Reset input
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    },
    [selectedView],
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
