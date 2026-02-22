// src/components/uploader/FolderSelectModal.tsx
// Reusable modal for selecting folder — used in HomeUpload & MyLibraryPage

import { useState, useEffect } from 'react';
import { Plus, Folder, Loader2, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFolders, useCreateFolder } from '../../hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface FolderSelectModalProps {
  open: boolean;
  /** File name(s) to display */
  fileNames: string[];
  /** External processing state (e.g. uploading) — disables buttons */
  isProcessing?: boolean;
  onClose: () => void;
  /** Called with selected folderId, or null for "No folder" */
  onConfirm: (folderId: string | null) => void;
  /** Remove a file by index (optional, for multi-file mode) */
  onRemoveFile?: (index: number) => void;
  /** Pre-selected folder ID (defaults to 'none') */
  defaultFolderId?: string | null;
  /** Custom confirm button label */
  confirmLabel?: string;
}

export function FolderSelectModal({
  open,
  fileNames,
  isProcessing = false,
  onClose,
  onConfirm,
  onRemoveFile,
  defaultFolderId = null,
  confirmLabel = 'Upload',
}: FolderSelectModalProps) {
  const { data: folders = [], isLoading: isLoadingFolders } = useFolders(open);
  const createFolderMutation = useCreateFolder();

  // 'none' = no folder, otherwise = folder ID
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedFolderId(defaultFolderId ?? 'none');
      setShowNewFolderInput(false);
      setNewFolderName('');
    }
  }, [open, defaultFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const result = await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
      });
      if (result.data) {
        setSelectedFolderId(result.data.id);
        setShowNewFolderInput(false);
        setNewFolderName('');
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleConfirm = () => {
    const folderId = selectedFolderId === 'none' ? null : selectedFolderId;
    onConfirm(folderId);
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const fileDescription =
    fileNames.length === 1
      ? `Choose where to save "${fileNames[0]}"`
      : `Choose where to save ${fileNames.length} file(s)`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !isProcessing && !o && handleClose()}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Select a Folder</DialogTitle>
          <DialogDescription>{fileDescription}</DialogDescription>
        </DialogHeader>

        <div className='py-4'>
          {/* File list (multi-file mode) */}
          {fileNames.length > 1 && (
            <div className='mb-4 pb-4 border-b'>
              <p className='text-sm font-medium text-gray-700 mb-2'>
                {fileNames.length} file(s):
              </p>
              <div className='max-h-[120px] overflow-auto space-y-1'>
                {fileNames.map((name, idx) => (
                  <div
                    key={idx}
                    className='flex items-center gap-2 text-sm'
                  >
                    <FileText className='h-4 w-4 text-red-500 shrink-0' />
                    <span className='flex-1 min-w-0 truncate'>{name}</span>
                    {onRemoveFile && !isProcessing && (
                      <button
                        onClick={() => onRemoveFile(idx)}
                        className='p-1 hover:bg-gray-100 rounded'
                      >
                        <X className='h-3 w-3 text-gray-400' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoadingFolders ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
            </div>
          ) : (
            <>
              {/* Folder List */}
              <div className='space-y-1 max-h-[200px] overflow-auto'>
                {/* "No folder" option */}
                <label
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                    selectedFolderId === 'none'
                      ? 'bg-orange-50 border border-orange-200'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <input
                    type='radio'
                    name='folder'
                    value='none'
                    checked={selectedFolderId === 'none'}
                    onChange={() => setSelectedFolderId('none')}
                    className='w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500'
                  />
                  <Folder className='h-4 w-4 text-gray-400' />
                  <span className='text-sm text-gray-500 italic'>
                    No folder (Uncategorized)
                  </span>
                </label>

                {/* Existing folders */}
                {folders.map((folder) => (
                  <label
                    key={folder.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                      selectedFolderId === folder.id
                        ? 'bg-orange-50 border border-orange-200'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <input
                      type='radio'
                      name='folder'
                      value={folder.id}
                      checked={selectedFolderId === folder.id}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className='w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500'
                    />
                    <Folder className='h-4 w-4 text-yellow-500' />
                    <span className='text-sm text-gray-700'>{folder.name}</span>
                  </label>
                ))}
              </div>

              {/* New Folder Section */}
              <div className='mt-4 pt-4 border-t'>
                {showNewFolderInput ? (
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-gray-700'>
                      Enter Folder Name
                    </label>
                    <Input
                      placeholder='e.g. Research Papers'
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleCreateFolder()
                      }
                      autoFocus
                    />
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size='sm'
                        onClick={handleCreateFolder}
                        disabled={
                          !newFolderName.trim() ||
                          createFolderMutation.isPending
                        }
                        className='bg-orange-500 hover:bg-orange-600'
                      >
                        {createFolderMutation.isPending
                          ? 'Creating...'
                          : 'Create'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    className='gap-2'
                    onClick={() => setShowNewFolderInput(true)}
                  >
                    <Plus className='h-4 w-4' />
                    New Folder
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || fileNames.length === 0}
            className='bg-orange-500 hover:bg-orange-600'
          >
            {isProcessing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Uploading...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
