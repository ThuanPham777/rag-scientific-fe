import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { validateFile } from '../utils/file';
import { uploadPdf } from '../services/api';
import { usePaperStore } from '../store/usePaperStore';
import { useFolderStore } from '../store/useFolderStore';
import type { UploadItem } from '../types/upload';

interface UseUploadOptions {
  onUploadComplete?: () => void;
  selectedView?: string;
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete, selectedView = 'all' } = options;

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { addPaper } = usePaperStore();
  const { createFolder, isCreating } = useFolderStore();

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
        const { paper } = await uploadPdf(item.file, (progress) => {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress } : q)),
          );
        });

        // Success
        addPaper(paper);
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

    setIsUploading(false);
    onUploadComplete?.();
  }, [isUploading, uploadQueue, addPaper, onUploadComplete]);

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
    const result = await createFolder({ name: newFolderName.trim() });
    if (result) {
      setUploadFolderId(result.id);
      setShowNewFolderInput(false);
      setNewFolderName('');
    }
  }, [newFolderName, createFolder]);

  return {
    // State
    uploadQueue,
    isUploading,
    showUploadDialog,
    uploadFolderId,
    showNewFolderInput,
    newFolderName,
    isCreating,
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
