import { useState } from 'react';
import { clsx } from 'clsx';
import { MoreVertical, Download, Trash2, Share2, Edit2, Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { format } from 'date-fns';
import { FileIcon } from './FileIcon';
import { Dropdown, DropdownItem, DropdownDivider, Avatar } from '@/components/ui';
import { ShareModal } from '@/components/share';
import { useUIStore } from '@/stores/uiStore';
import { fileService } from '@/services/fileService';
import type { FileItem, SortField } from '@/types';

interface FileListProps {
  files: FileItem[];
  boxId: string;
  onFileClick: (file: FileItem) => void;
  onRefresh: () => void;
}

export function FileList({ files, boxId, onFileClick, onRefresh }: FileListProps) {
  const { selectedFiles, selectFile, sortField, sortOrder, setSortField, toggleSortOrder } = useUIStore();
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      toggleSortOrder();
    } else {
      setSortField(field);
    }
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
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const columnHeaderClass = (field: SortField) =>
    clsx(
      'flex cursor-pointer items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
      sortField === field && 'text-slate-900 dark:text-white'
    );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="col-span-5 sm:col-span-6">
          <button className={columnHeaderClass('name')} onClick={() => handleSort('name')}>
            Name <SortIcon field="name" />
          </button>
        </div>
        <div className="col-span-2 hidden sm:block">
          <button className={columnHeaderClass('size')} onClick={() => handleSort('size')}>
            Size <SortIcon field="size" />
          </button>
        </div>
        <div className="col-span-3 hidden md:block">
          <button className={columnHeaderClass('updatedAt')} onClick={() => handleSort('updatedAt')}>
            Modified <SortIcon field="updatedAt" />
          </button>
        </div>
        <div className="col-span-2 hidden lg:block">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Owner
          </span>
        </div>
        <div className="col-span-1" />
      </div>

      {/* File rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {files.map((file) => {
          const isSelected = selectedFiles.has(file.id);
          // File is considered trashed if status === 2
          const isTrashed = file.status === 2;

          return (
            <div
              key={file.id}
              className={clsx(
                'grid grid-cols-12 items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50',
                isSelected && 'bg-primary-50 dark:bg-primary-900/20'
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
              {/* Checkbox + Name */}
              <div className="col-span-5 flex items-center gap-3 sm:col-span-6">
                {/* Selection checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    selectFile(file.id, true);
                  }}
                  className={clsx(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-slate-300 hover:border-primary-400 dark:border-slate-600'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <FileIcon mimeType={file.mime || 'application/octet-stream'} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-medium text-slate-900 dark:text-white"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                  </div>
                  {file.tags && file.tags.length > 0 && (
                    <div className="mt-0.5 flex gap-1">
                      {file.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Size */}
              <div className="col-span-2 hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
                {file.sizeFormatted || formatFileSize(file.size)}
              </div>

              {/* Modified */}
              <div className="col-span-3 hidden text-sm text-slate-500 dark:text-slate-400 md:block">
                {format(new Date(file.lastModifyDate || file.uploadDate), 'MMM d, yyyy')}
              </div>

              {/* Owner */}
              <div className="col-span-2 hidden items-center gap-2 lg:flex">
                <Avatar
                  name={file.authorName || 'Unknown'}
                  size="sm"
                />
                <span className="truncate text-sm text-slate-600 dark:text-slate-300">
                  {file.authorName || 'Unknown'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end">
                <Dropdown
                  trigger={
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
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
          );
        })}
      </div>

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
