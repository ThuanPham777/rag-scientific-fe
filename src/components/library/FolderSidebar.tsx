import {
  Plus,
  Folder,
  ChevronDown,
  ChevronRight,
  File,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '../../lib/utils';
import type { Folder as FolderType } from '../../utils/types';

interface FolderSidebarProps {
  folders: FolderType[];
  selectedView: 'all' | string;
  foldersExpanded: boolean;
  isLoadingFolders: boolean;
  onSelectView: (view: 'all' | string) => void;
  onToggleFolders: () => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderType, e: React.MouseEvent) => void;
  onDeleteFolder: (folder: FolderType, e: React.MouseEvent) => void;
}

export function FolderSidebar({
  folders,
  selectedView,
  foldersExpanded,
  isLoadingFolders,
  onSelectView,
  onToggleFolders,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  return (
    <aside className='w-64 border-r bg-gray-50 flex flex-col'>
      <div className='p-4 border-b'>
        <h1 className='text-lg font-semibold text-gray-900'>My Library</h1>
        <p className='text-xs text-gray-500 mt-1'>Personal</p>
      </div>

      <nav className='flex-1 overflow-y-auto p-2'>
        <button
          onClick={() => onSelectView('all')}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            selectedView === 'all'
              ? 'bg-orange-100 text-orange-700'
              : 'text-gray-700 hover:bg-gray-100',
          )}
        >
          <File className='h-4 w-4' />
          <span>All files</span>
        </button>

        <div className='mt-4'>
          <button
            onClick={onToggleFolders}
            className='w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md'
          >
            <div className='flex items-center gap-2'>
              {foldersExpanded ? (
                <ChevronDown className='h-4 w-4' />
              ) : (
                <ChevronRight className='h-4 w-4' />
              )}
              <span>Folders ({folders.length})</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder();
              }}
              className='p-1 hover:bg-gray-200 rounded'
              title='Create a New folder'
            >
              <Plus className='h-4 w-4' />
            </button>
          </button>

          {foldersExpanded && (
            <div className='mt-1 space-y-1 pl-4'>
              {isLoadingFolders ? (
                <div className='flex items-center justify-center py-4'>
                  <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
                </div>
              ) : folders.length === 0 ? (
                <p className='text-xs text-gray-400 px-3 py-2'>
                  No folders yet
                </p>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors',
                      selectedView === folder.id
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100',
                    )}
                    onClick={() => onSelectView(folder.id)}
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <Folder className='h-4 w-4 shrink-0 text-gray-500' />
                      <span className='truncate'>{folder.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className='p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity'
                        >
                          <MoreHorizontal className='h-4 w-4' />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align='end'
                        className='w-32'
                      >
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) =>
                            onEditFolder(folder, e)
                          }
                        >
                          <Edit2 className='mr-2 h-4 w-4' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) =>
                            onDeleteFolder(folder, e)
                          }
                          className='text-red-600'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
