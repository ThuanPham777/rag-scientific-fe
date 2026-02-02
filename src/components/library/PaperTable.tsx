import {
  FileText,
  MoreHorizontal,
  Trash2,
  FolderInput,
  Upload,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Paper } from '../../utils/types';

interface PaperTableProps {
  papers: Paper[];
  totalPapers: number;
  isLoading: boolean;
  onPaperClick: (paper: Paper) => void;
  onMovePaper: (paper: Paper, e: React.MouseEvent) => void;
  onDeletePaper: (paper: Paper, e: React.MouseEvent) => void;
  onUploadClick: () => void;
}

export function PaperTable({
  papers,
  totalPapers,
  isLoading,
  onPaperClick,
  onMovePaper,
  onDeletePaper,
  onUploadClick,
}: PaperTableProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-center'>
        <FileText className='h-12 w-12 text-gray-300 mb-4' />
        <h3 className='text-lg font-medium text-gray-600'>No papers yet</h3>
        <p className='text-sm text-gray-500 mt-1'>
          Upload papers to get started
        </p>
        <Button
          onClick={onUploadClick}
          variant='outline'
          className='mt-4 gap-2'
        >
          <Upload className='h-4 w-4' />
          Upload Paper
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Table header */}
      <div className='sticky top-0 bg-gray-50 border-b px-6 py-3'>
        <div className='grid grid-cols-12 gap-4 text-sm font-medium text-gray-500'>
          <div className='col-span-6'>
            Files ({papers.length}/{totalPapers})
          </div>
          <div className='col-span-4'>Title</div>
          <div className='col-span-2 text-right'>Actions</div>
        </div>
      </div>

      {/* Table body */}
      <div className='divide-y'>
        {papers.map((paper) => (
          <div
            key={paper.id}
            className='grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors'
            onClick={() => onPaperClick(paper)}
          >
            <div className='col-span-6 flex items-start gap-3 min-w-0'>
              <div className='shrink-0 w-10 h-12 bg-red-100 rounded flex items-center justify-center'>
                <FileText className='h-5 w-5 text-red-600' />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium text-gray-900 truncate'>
                  {paper.fileName}
                </p>
                <p className='text-xs text-gray-500 mt-1'>
                  {new Date(paper.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className='col-span-4 flex items-center min-w-0'>
              <p className='text-sm text-gray-600 truncate'>
                {paper.title || '-'}
              </p>
            </div>
            <div className='col-span-2 flex items-center justify-end'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align='end'
                  className='w-36'
                >
                  <DropdownMenuItem
                    onClick={(e: React.MouseEvent) => onMovePaper(paper, e)}
                  >
                    <FolderInput className='mr-2 h-4 w-4' />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e: React.MouseEvent) => onDeletePaper(paper, e)}
                    className='text-red-600'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
