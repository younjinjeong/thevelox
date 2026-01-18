import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Download,
  Grid,
  List,
  Settings,
  MoreHorizontal,
  Trash2,
  Tag,
  Move,
  MessageSquare,
  Share2,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { boxService } from '@/services/boxService';
import { fileService } from '@/services/fileService';
import { useUIStore } from '@/stores/uiStore';
import { FileGrid, FileList, FileUpload } from '@/components/files';
import { TagManager } from '@/components/tags';
import { NoteCanvas } from '@/components/notes';
import { Button, Dropdown, DropdownItem, DropdownDivider, Avatar } from '@/components/ui';
import type { FileItem } from '@/types';

const toolbarItems = [
  { icon: Upload, label: 'Upload', action: 'upload', requiresSelection: false },
  { icon: Download, label: 'Download', action: 'download', requiresSelection: true },
  { icon: Trash2, label: 'Delete', action: 'delete', requiresSelection: true },
  { icon: Tag, label: 'Tag', action: 'tag', requiresSelection: false },
  { icon: Move, label: 'Move', action: 'move', requiresSelection: true },
  { icon: MessageSquare, label: 'Notes', action: 'message', requiresSelection: false },
  { icon: Share2, label: 'Share', action: 'share', requiresSelection: true },
] as const;

export function BoxDetailPage() {
  const { boxId } = useParams<{ boxId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    viewMode,
    setViewMode,
    uploadModalOpen,
    setUploadModalOpen,
    selectedFiles,
    selectAll,
    clearSelection,
  } = useUIStore();
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [notesCanvasOpen, setNotesCanvasOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const CONFIRMATION_TEXT = 'delete all';
  const isDeleteConfirmed = deleteConfirmText.toLowerCase() === CONFIRMATION_TEXT;

  const { data: box, isLoading: boxLoading, error: boxError } = useQuery({
    queryKey: ['box', boxId],
    queryFn: () => boxService.getBox(boxId!),
    enabled: !!boxId,
    retry: 1, // Only retry once if box is not found
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', boxId],
    queryFn: () => fileService.getFiles(boxId!, { limit: 100 }),
    enabled: !!boxId,
  });

  const files = filesData?.data || [];
  const selectedCount = selectedFiles.size;
  const allSelected = files.length > 0 && selectedCount === files.length;
  const someSelected = selectedCount > 0 && selectedCount < files.length;

  // Clear selection when changing boxes
  useEffect(() => {
    clearSelection();
  }, [boxId, clearSelection]);

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(files.map(f => f.id));
    }
  };

  const getSelectedFiles = (): FileItem[] => {
    return files.filter(f => selectedFiles.has(f.id));
  };

  const handleDownloadSelected = async () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) {
      toast.error('Please select files to download');
      return;
    }

    // Download each selected file
    for (const file of selected) {
      const url = fileService.getDownloadUrl(boxId!, file.id);
      window.open(url, '_blank');
    }
    toast.success(`Downloading ${selected.length} file(s)`);
  };

  const handleDeleteSelected = async () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) {
      toast.error('Please select files to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selected.length} file(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await fileService.bulkTrash(boxId!, selected.map(f => f.id));
      toast.success(`Deleted ${selected.length} file(s)`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['files', boxId] });
    } catch (error) {
      toast.error('Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToolbarAction = async (action: string) => {
    const selected = getSelectedFiles();

    switch (action) {
      case 'upload':
        setUploadModalOpen(true);
        break;
      case 'download':
        await handleDownloadSelected();
        break;
      case 'delete':
        await handleDeleteSelected();
        break;
      case 'tag':
        setTagsModalOpen(true);
        break;
      case 'move':
        if (selected.length === 0) {
          toast.error('Please select files to move');
        } else {
          toast('Move feature coming soon!');
        }
        break;
      case 'message':
        setNotesCanvasOpen(true);
        break;
      case 'share':
        if (selected.length === 0) {
          toast.error('Please select files to share');
        } else {
          toast('Share feature coming soon!');
        }
        break;
      default:
        toast(`${action} coming soon!`);
    }
  };

  const handleFileClick = (file: FileItem) => {
    // TODO: Open file preview modal
    console.log('Open file:', file);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['files', boxId] });
  };

  const handleDeleteBox = async () => {
    if (!isDeleteConfirmed || !box) return;

    setIsDeleting(true);
    try {
      await boxService.deleteBox(box.id);
      toast.success(`Box "${box.name}" has been permanently deleted`);
      // Invalidate boxes list and navigate back
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      navigate('/boxes');
    } catch (error: any) {
      console.error('Delete box error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete box');
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  if (boxLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!box || boxError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">
          {boxError ? 'Unable to load box' : 'Box not found'}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {boxError ? 'The box may have been deleted or you may not have access to it.' : 'This box does not exist.'}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/boxes')}
        >
          Back to Boxes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/boxes')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{box.name}</h1>
            {box.description && (
              <p className="mt-1 text-slate-600 dark:text-slate-400">{box.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Members */}
          <div className="hidden items-center gap-1 lg:flex">
            {box.members.slice(0, 4).map((member) => (
              <Avatar
                key={member.user.id}
                src={member.user.photo}
                name={member.user.name}
                size="sm"
                className="-ml-2 first:ml-0 ring-2 ring-white dark:ring-slate-900"
              />
            ))}
            {box.members.length > 4 && (
              <span className="ml-1 text-sm text-slate-500">+{box.members.length - 4}</span>
            )}
          </div>

          <Dropdown
            trigger={
              <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            }
          >
            <DropdownItem icon={<Settings className="h-4 w-4" />}>Box Settings</DropdownItem>
            <DropdownDivider />
            <DropdownItem
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
              danger
            >
              Delete Box
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Inline Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Delete Box Permanently
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                You are about to permanently delete <strong>"{box.name}"</strong>
                {files.length > 0 && (
                  <> and all <strong>{files.length} file{files.length !== 1 ? 's' : ''}</strong> inside it</>
                )}.
                This action cannot be undone.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-medium text-red-700 dark:text-red-300">
                  Type <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">{CONFIRMATION_TEXT}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  className="mt-2 w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-800 dark:bg-slate-900 dark:text-white dark:focus:border-red-500"
                  disabled={isDeleting}
                  autoFocus
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteBox}
                  disabled={!isDeleteConfirmed || isDeleting}
                  isLoading={isDeleting}
                >
                  Delete Box Permanently
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          {/* Select All Checkbox */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? (
              <CheckSquare className="h-5 w-5 text-primary-500" />
            ) : someSelected ? (
              <div className="relative">
                <Square className="h-5 w-5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 bg-primary-500 rounded-sm" />
                </div>
              </div>
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>

          {/* Selection info or divider */}
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 border-l border-slate-300 pl-2 dark:border-slate-600">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {selectedCount} selected
              </span>
              <button
                onClick={clearSelection}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="border-l border-slate-300 pl-2 dark:border-slate-600" />
          )}

          {/* Toolbar actions */}
          {toolbarItems.map((item) => {
            const isDisabled = item.requiresSelection && selectedCount === 0;
            return (
              <button
                key={item.action}
                onClick={() => handleToolbarAction(item.action)}
                disabled={isDisabled || isDeleting}
                className={clsx(
                  'group relative rounded-lg p-2 transition-colors',
                  isDisabled
                    ? 'text-slate-300 cursor-not-allowed dark:text-slate-600'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-700 pointer-events-none z-10">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : files.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid
            files={files}
            boxId={boxId!}
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        ) : (
          <FileList
            files={files}
            boxId={boxId!}
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
          <Upload className="mb-4 h-12 w-12 text-slate-400" />
          <h3 className="font-medium text-slate-900 dark:text-white">No files yet</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Upload your first file to this box
          </p>
          <Button
            className="mt-4"
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Files
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <FileUpload
        boxId={boxId!}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleRefresh}
      />

      {/* Tags Manager Modal */}
      <TagManager
        boxId={boxId!}
        isOpen={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
      />

      {/* Notes Canvas */}
      <NoteCanvas
        boxId={boxId!}
        isOpen={notesCanvasOpen}
        onClose={() => setNotesCanvasOpen(false)}
      />
    </div>
  );
}
