import { clsx } from 'clsx';
import { MoreVertical, Star, Download, Trash2, Share2, Edit2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { FileIcon } from './FileIcon';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui';
import { useUIStore } from '@/stores/uiStore';
import { fileService } from '@/services/fileService';
import type { FileItem } from '@/types';

interface FileGridProps {
  files: FileItem[];
  boxId: string;
  onFileClick: (file: FileItem) => void;
  onRefresh: () => void;
}

export function FileGrid({ files, boxId, onFileClick, onRefresh }: FileGridProps) {
  const { selectedFiles, selectFile } = useUIStore();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileAction = async (action: string, file: FileItem) => {
    switch (action) {
      case 'download':
        window.open(fileService.getDownloadUrl(boxId, file.id), '_blank');
        break;
      case 'star':
        await fileService.toggleStar(boxId, file.id);
        onRefresh();
        break;
      case 'trash':
        await fileService.moveToTrash(boxId, file.id);
        onRefresh();
        break;
      case 'share':
        // TODO: Open share modal
        break;
      case 'rename':
        // TODO: Open rename modal
        break;
      case 'copy':
        // TODO: Open copy modal
        break;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.id);
        const hasPreview = file.mimeType.startsWith('image/') && file.thumbnail;

        return (
          <div
            key={file.id}
            className={clsx(
              'group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md dark:bg-slate-800',
              isSelected
                ? 'border-primary-500 ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-700'
            )}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                selectFile(file.id, true);
              } else if (e.detail === 2) {
                onFileClick(file);
              } else {
                selectFile(file.id, false);
              }
            }}
          >
            {/* Preview / Icon */}
            <div className="relative flex h-32 items-center justify-center bg-slate-50 dark:bg-slate-900">
              {hasPreview ? (
                <img
                  src={fileService.getThumbnailUrl(boxId, file.id)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileIcon mimeType={file.mimeType} size="xl" />
              )}

              {/* Star indicator */}
              {file.isStarred && (
                <Star className="absolute left-2 top-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}

              {/* Actions */}
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Dropdown
                  trigger={
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow hover:bg-white dark:bg-slate-800/90 dark:text-slate-300"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => handleFileAction('download', file)}
                  >
                    Download
                  </DropdownItem>
                  <DropdownItem
                    icon={<Share2 className="h-4 w-4" />}
                    onClick={() => handleFileAction('share', file)}
                  >
                    Share
                  </DropdownItem>
                  <DropdownItem
                    icon={<Star className="h-4 w-4" />}
                    onClick={() => handleFileAction('star', file)}
                  >
                    {file.isStarred ? 'Remove star' : 'Add star'}
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem
                    icon={<Edit2 className="h-4 w-4" />}
                    onClick={() => handleFileAction('rename', file)}
                  >
                    Rename
                  </DropdownItem>
                  <DropdownItem
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => handleFileAction('copy', file)}
                  >
                    Copy to...
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => handleFileAction('trash', file)}
                    danger
                  >
                    Move to trash
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>

            {/* File info */}
            <div className="flex flex-1 flex-col p-3">
              <h3
                className="truncate text-sm font-medium text-slate-900 dark:text-white"
                title={file.name}
              >
                {file.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{format(new Date(file.createdAt), 'MMM d')}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
