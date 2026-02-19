import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { validateFile } from '../../utils/file';
import { uploadPdf } from '../../services';
import { paperKeys } from '../queries';
import type { UploadItem } from '../../types/upload';

interface UseUploadOptions {
  onUploadComplete?: () => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete } = options;
  const queryClient = useQueryClient();

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

  const onFilesSelected = useCallback((files: FileList | null) => {
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
      setShowUploadDialog(true);
    }
    // Reset input
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  }, []);

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
        await uploadPdf(item.file, (progress) => {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress } : q)),
          );
        });

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
              ? { ...q, status: 'error', error: err.message || 'Upload failed' }
              : q,
          ),
        );
        toast.error(`Failed to upload ${item.file.name}`);
      }
    }

    // Invalidate React Query caches to refetch data (including infinite queries)
    queryClient.invalidateQueries({ queryKey: paperKeys.all });

    setIsUploading(false);
    onUploadComplete?.();

    // Auto-close dialog after brief delay to show completion state
    setTimeout(() => {
      setShowUploadDialog(false);
      setUploadQueue([]);
    }, 800);
  }, [isUploading, uploadQueue, queryClient, onUploadComplete]);

  const closeUploadDialog = useCallback(() => {
    if (isUploading) return;
    setShowUploadDialog(false);
    setUploadQueue([]);
  }, [isUploading]);

  return {
    // State
    uploadQueue,
    isUploading,
    showUploadDialog,
    uploadInputRef,

    // Setters
    setShowUploadDialog,

    // Actions
    handleUploadClick,
    onFilesSelected,
    removeFromQueue,
    processUploadQueue,
    closeUploadDialog,
  };
}
