import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, Search, Grid, List } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { boxService } from '@/services/boxService';
import { useUIStore } from '@/stores/uiStore';
import { BoxCard, CreateBoxModal } from '@/components/boxes';
import { Button, Input } from '@/components/ui';

export function BoxesPage() {
  const queryClient = useQueryClient();
  const { createBoxModalOpen, setCreateBoxModalOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: boxesData, isLoading } = useQuery({
    queryKey: ['boxes'],
    queryFn: () => boxService.getBoxes(1, 50),
  });

  const deleteMutation = useMutation({
    mutationFn: boxService.deleteBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      toast.success('Box deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete box');
    },
  });

  const boxes = boxesData?.data || [];
  const filteredBoxes = boxes.filter((box) =>
    box.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (boxId: string) => {
    if (confirm('Are you sure you want to delete this box? This action cannot be undone.')) {
      deleteMutation.mutate(boxId);
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

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search boxes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'rounded-lg p-2 transition-colors',
              viewMode === 'grid'
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'rounded-lg p-2 transition-colors',
              viewMode === 'list'
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredBoxes.length > 0 ? (
        <div
          className={clsx(
            viewMode === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-3'
          )}
        >
          {filteredBoxes.map((box) => (
            <BoxCard key={box.id} box={box} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
          <Folder className="mb-4 h-12 w-12 text-slate-400" />
          {searchQuery ? (
            <>
              <h3 className="font-medium text-slate-900 dark:text-white">No boxes found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try a different search term
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Create Box Modal */}
      <CreateBoxModal
        isOpen={createBoxModalOpen}
        onClose={() => setCreateBoxModalOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['boxes'] })}
      />
    </div>
  );
}
