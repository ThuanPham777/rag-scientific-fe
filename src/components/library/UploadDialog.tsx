import {
  Plus,
  Folder,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '../../lib/utils';
import type { Folder as FolderType } from '../../utils/types';
import type { UploadItem } from '../../types/upload';

interface UploadDialogProps {
  open: boolean;
  folders: FolderType[];
  uploadQueue: UploadItem[];
  uploadFolderId: string;
  isUploading: boolean;
  isCreating: boolean;
  showNewFolderInput: boolean;
  newFolderName: string;
  onOpenChange: (open: boolean) => void;
  onFolderSelect: (folderId: string) => void;
  onRemoveFromQueue: (id: string) => void;
  onUpload: () => void;
  onClose: () => void;
  onShowNewFolderInput: (show: boolean) => void;
  onNewFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
}

export function UploadDialog({
  open,
  folders,
  uploadQueue,
  uploadFolderId,
  isUploading,
  isCreating,
  showNewFolderInput,
  newFolderName,
  onOpenChange,
  onFolderSelect,
  onRemoveFromQueue,
  onUpload,
  onClose,
  onShowNewFolderInput,
  onNewFolderNameChange,
  onCreateFolder,
}: UploadDialogProps) {
  const hasPendingItems = uploadQueue.some((q) => q.status === 'pending');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !isUploading && onOpenChange(o)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Select a Collection</DialogTitle>
        </DialogHeader>

        <div className='py-4'>
          {/* Folder List with Radio Buttons */}
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
                    uploadFolderId === folder.id
                      ? 'bg-orange-50'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <input
                    type='radio'
                    name='uploadFolder'
                    value={folder.id}
                    checked={uploadFolderId === folder.id}
                    onChange={(e) => onFolderSelect(e.target.value)}
                    className='w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500'
                  />
                  <Folder className='h-4 w-4 text-gray-400' />
                  <span className='text-sm text-gray-700'>{folder.name}</span>
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
                  placeholder='e.g. Project Documents'
                  value={newFolderName}
                  onChange={(e) => onNewFolderNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onCreateFolder()}
                  autoFocus
                />
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      onShowNewFolderInput(false);
                      onNewFolderNameChange('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size='sm'
                    onClick={onCreateFolder}
                    disabled={!newFolderName.trim() || isCreating}
                    className='bg-orange-500 hover:bg-orange-600'
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant='outline'
                className='gap-2'
                onClick={() => onShowNewFolderInput(true)}
              >
                <Plus className='h-4 w-4' />
                New Folder
              </Button>
            )}
          </div>

          {/* Selected Files Summary */}
          {uploadQueue.length > 0 && (
            <div className='mt-4 pt-4 border-t'>
              <p className='text-sm text-gray-600 mb-2'>
                {uploadQueue.length} file(s) selected:
              </p>
              <div className='max-h-[120px] overflow-auto space-y-2'>
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center gap-2 text-sm'
                  >
                    <FileText className='h-4 w-4 text-red-500 shrink-0' />
                    <span className='truncate flex-1'>{item.file.name}</span>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => onRemoveFromQueue(item.id)}
                        className='p-1 hover:bg-gray-100 rounded'
                      >
                        <X className='h-3 w-3 text-gray-400' />
                      </button>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className='h-4 w-4 animate-spin text-orange-500' />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle className='h-4 w-4 text-green-500' />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className='h-4 w-4 text-red-500' />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={onUpload}
            disabled={
              isUploading ||
              uploadQueue.length === 0 ||
              !uploadFolderId ||
              !hasPendingItems
            }
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
