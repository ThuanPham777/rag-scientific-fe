// src/components/uploader/FolderSelectModal.tsx
// Modal for selecting folder when uploading from Home page (logged-in users)

import { useState, useEffect } from 'react';
import { Plus, Folder, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '../../lib/utils';
import { useFolders, useCreateFolder } from '../../hooks';

interface FolderSelectModalProps {
  open: boolean;
  fileName: string;
  isUploading: boolean;
  onClose: () => void;
  onConfirm: (folderId: string | null) => void;
}

export function FolderSelectModal({
  open,
  fileName,
  isUploading,
  onClose,
  onConfirm,
}: FolderSelectModalProps) {
  // Use React Query hooks instead of Zustand store
  // Only fetch folders when modal is open to prevent unnecessary API calls
  const { data: folders = [], isLoading: isLoadingFolders } = useFolders(open);
  const createFolderMutation = useCreateFolder();

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Auto-select first folder if available
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

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
    onConfirm(selectedFolderId || null);
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFolderId('');
      setShowNewFolderInput(false);
      setNewFolderName('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !isUploading && !o && handleClose()}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Select a Collection</DialogTitle>
          <DialogDescription>
            Choose where to save "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <div className='py-4'>
          {isLoadingFolders ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
            </div>
          ) : (
            <>
              {/* Folder List */}
              <div className='space-y-1 max-h-[200px] overflow-auto'>
                {folders.length === 0 ? (
                  <p className='text-sm text-gray-500 text-center py-4'>
                    No folders yet. Create one below.
                  </p>
                ) : (
                  folders.map((folder) => (
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
                      <span className='text-sm text-gray-700'>
                        {folder.name}
                      </span>
                    </label>
                  ))
                )}
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
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUploading || !selectedFolderId}
            className='bg-orange-500 hover:bg-orange-600'
          >
            {isUploading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
