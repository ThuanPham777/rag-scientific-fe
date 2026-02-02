import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Folder as FolderType } from '../../utils/types';

interface CreateFolderDialogProps {
  open: boolean;
  folderName: string;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderNameChange: (name: string) => void;
  onCreate: () => void;
}

export function CreateFolderDialog({
  open,
  folderName,
  isCreating,
  onOpenChange,
  onFolderNameChange,
  onCreate,
}: CreateFolderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for your new folder
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <Input
            placeholder='Folder name'
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={isCreating || !folderName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditFolderDialogProps {
  open: boolean;
  folderName: string;
  onOpenChange: (open: boolean) => void;
  onFolderNameChange: (name: string) => void;
  onSave: () => void;
}

export function EditFolderDialog({
  open,
  folderName,
  onOpenChange,
  onFolderNameChange,
  onSave,
}: EditFolderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription>Update the folder name</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <Input
            placeholder='Folder name'
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!folderName.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  open: boolean;
  folder: FolderType | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

export function DeleteFolderDialog({
  open,
  folder,
  isDeleting,
  onOpenChange,
  onDelete,
}: DeleteFolderDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Delete Folder</DialogTitle>
          <DialogDescription className='space-y-2'>
            <span>Are you sure you want to delete "{folder?.name}"?</span>
            <br />
            <span className='font-semibold text-red-600'>
              Warning: All papers in this folder will be permanently deleted.
            </span>
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
