import { useState } from 'react';
import { clsx } from 'clsx';
import { MoreVertical, Download, Trash2, Share2, Edit2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { FileIcon } from './FileIcon';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui';
import { ShareModal } from '@/components/share';
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
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

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
        setShareFile(file);
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
        const mimeType = file.mime || 'application/octet-stream';
        const hasPreview = file.isImage && file.images?.thumbnail;
        const isTrashed = file.status === 2;

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
                <FileIcon mimeType={mimeType} size="xl" />
              )}

              {/* Selection checkbox */}
              <div
                className={clsx(
                  'absolute left-2 top-2 transition-opacity',
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    selectFile(file.id, true);
                  }}
                  className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded-md border-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-slate-300 bg-white/90 hover:border-primary-400 dark:border-slate-600 dark:bg-slate-800/90'
                  )}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              </div>

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
                    {isTrashed ? 'Delete permanently' : 'Move to trash'}
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
                <span>{file.sizeFormatted || formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{format(new Date(file.uploadDate), 'MMM d')}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Share Modal */}
      {shareFile && (
        <ShareModal
          fileId={shareFile.id}
          fileName={shareFile.name}
          isOpen={!!shareFile}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
}
