import { Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Paper, Folder as FolderType } from '../../utils/types';

interface DeletePaperDialogProps {
  open: boolean;
  paper: Paper | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function DeletePaperDialog({
  open,
  paper,
  isDeleting,
  onOpenChange,
  onDelete,
}: DeletePaperDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Delete Paper</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{paper?.fileName}"? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MovePaperDialogProps {
  open: boolean;
  paper: Paper | null;
  folders: FolderType[];
  targetFolderId: string;
  isMoving: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetFolderChange: (folderId: string) => void;
  onMove: () => void;
}

export function MovePaperDialog({
  open,
  paper,
  folders,
  targetFolderId,
  isMoving,
  onOpenChange,
  onTargetFolderChange,
  onMove,
}: MovePaperDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Move Paper</DialogTitle>
          <DialogDescription>
            Move "{paper?.fileName}" to a different folder
          </DialogDescription>
        </DialogHeader>
        <div className='py-4 max-h-60 overflow-y-auto space-y-2'>
          {/* No folder option */}
          <label className='flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50'>
            <input
              type='radio'
              name='moveFolder'
              value='none'
              checked={targetFolderId === 'none'}
              onChange={() => onTargetFolderChange('none')}
              className='w-4 h-4 text-blue-600'
            />
            <Folder className='h-5 w-5 text-gray-400' />
            <span className='text-gray-500'>No folder (uncategorized)</span>
          </label>
          {/* Folder list */}
          {folders.map((folder) => (
            <label
              key={folder.id}
              className='flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50'
            >
              <input
                type='radio'
                name='moveFolder'
                value={folder.id}
                checked={targetFolderId === folder.id}
                onChange={() => onTargetFolderChange(folder.id)}
                className='w-4 h-4 text-blue-600'
              />
              <Folder className='h-5 w-5 text-yellow-500' />
              <span>{folder.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onMove}
            disabled={isMoving || !targetFolderId}
          >
            {isMoving ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
