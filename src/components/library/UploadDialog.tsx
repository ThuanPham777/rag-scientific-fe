import { FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UploadItem } from '../../types/upload';

interface UploadDialogProps {
  open: boolean;
  uploadQueue: UploadItem[];
  isUploading: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveFromQueue: (id: string) => void;
  onUpload: () => void;
  onClose: () => void;
}

export function UploadDialog({
  open,
  uploadQueue,
  isUploading,
  onOpenChange,
  onRemoveFromQueue,
  onUpload,
  onClose,
}: UploadDialogProps) {
  const hasPendingItems = uploadQueue.some((q) => q.status === 'pending');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !isUploading && onOpenChange(o)}
    >
      <DialogContent className='sm:max-w-xl w-full max-h-[100vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Upload Papers</DialogTitle>
        </DialogHeader>

        <div className='py-4'>
          {/* Selected Files */}
          {uploadQueue.length > 0 && (
            <div>
              <p className='text-sm text-gray-600 mb-2'>
                {uploadQueue.length} file(s) selected:
              </p>
              <div className='max-h-[300px] overflow-auto space-y-2'>
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center gap-2 text-sm w-full min-w-0'
                  >
                    <FileText className='h-4 w-4 text-red-500 shrink-0' />
                    <span className='flex-1 min-w-0 truncate'>
                      {item.file.name}
                    </span>
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
              isUploading || uploadQueue.length === 0 || !hasPendingItems
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

