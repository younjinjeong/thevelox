import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Folder,
  Grid,
  List,
  Upload,
  Trash2,
  Tag,
  FolderPlus,
  FolderMinus,
  Move,
  MessageSquare,
  Share2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { boxService } from '@/services/boxService';
import { useUIStore } from '@/stores/uiStore';
import { BoxCard, CreateBoxModal } from '@/components/boxes';
import { Button } from '@/components/ui';
import type { Box } from '@/types';

const toolbarItems = [
  { icon: Upload, label: 'Upload', action: 'upload' },
  { icon: Trash2, label: 'Delete', action: 'delete' },
  { icon: Tag, label: 'Tag', action: 'tag' },
  { icon: FolderPlus, label: 'Create Directory', action: 'create-dir' },
  { icon: FolderMinus, label: 'Delete Directory', action: 'delete-dir' },
  { icon: Move, label: 'Move File', action: 'move' },
  { icon: MessageSquare, label: 'Send to Message', action: 'message' },
  { icon: Share2, label: 'Share', action: 'share' },
] as const;

const CONFIRMATION_TEXT = 'delete all';

export function BoxesPage() {
  const queryClient = useQueryClient();
  const { createBoxModalOpen, setCreateBoxModalOpen } = useUIStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<Box | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isDeleteConfirmed = deleteConfirmText.toLowerCase() === CONFIRMATION_TEXT;

  const { data: boxesData, isLoading } = useQuery({
    queryKey: ['boxes'],
    queryFn: () => boxService.getBoxes(1, 50),
  });

  const boxes = boxesData?.data || [];

  const handleDeleteBox = async () => {
    if (!isDeleteConfirmed || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await boxService.deleteBox(deleteTarget.id);
      toast.success(`Box "${deleteTarget.name}" has been permanently deleted`);
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      setDeleteTarget(null);
      setDeleteConfirmText('');
    } catch (error: any) {
      console.error('Delete box error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete box');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'upload':
        toast('Select a box to upload files');
        break;
      case 'delete':
        toast('Select items to delete');
        break;
      case 'tag':
        toast('Select items to tag');
        break;
      case 'create-dir':
        toast('Select a box to create directory');
        break;
      case 'delete-dir':
        toast('Select a directory to delete');
        break;
      case 'move':
        toast('Select files to move');
        break;
      case 'message':
        toast('Select files to send');
        break;
      case 'share':
        toast('Select items to share');
        break;
      default:
        toast(`${action} coming soon!`);
    }
  };

  const handleDelete = (boxId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    if (box) {
      setDeleteTarget(box);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Boxes</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateBoxModalOpen(true)}
        >
          New Box
        </Button>
      </div>

      {/* Inline Delete Confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  Delete Box Permanently
                </h3>
                <button
                  onClick={handleCancelDelete}
                  className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40"
                  disabled={isDeleting}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                You are about to permanently delete <strong>"{deleteTarget.name}"</strong>
                {deleteTarget.fileCount > 0 && (
                  <> and all <strong>{deleteTarget.fileCount} file{deleteTarget.fileCount !== 1 ? 's' : ''}</strong> inside it</>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {toolbarItems.map((item) => (
            <button
              key={item.action}
              onClick={() => handleToolbarAction(item.action)}
              className="group relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-700 pointer-events-none">
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : boxes.length > 0 ? (
        <div
          className={clsx(
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-3'
          )}
        >
          {boxes.map((box) => (
            <BoxCard key={box.id} box={box} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
          <Folder className="mb-4 h-12 w-12 text-slate-400" />
          <h3 className="font-medium text-slate-900 dark:text-white">No boxes yet</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create your first box to start organizing files
          </p>
          <Button
            className="mt-4"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateBoxModalOpen(true)}
          >
            Create Box
          </Button>
        </div>
      )}

      {/* Create Box Modal */}
      <CreateBoxModal
        isOpen={createBoxModalOpen}
        onClose={() => setCreateBoxModalOpen(false)}
        onCreated={async () => {
          // Force refetch of boxes after creation
          await queryClient.invalidateQueries({ queryKey: ['boxes'] });
          await queryClient.refetchQueries({ queryKey: ['boxes'] });
        }}
      />
    </div>
  );
}
