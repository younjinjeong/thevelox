import { useState } from 'react';
import { Trash2, Grid, List, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { useUIStore } from '@/stores/uiStore';
import { Button, Input } from '@/components/ui';

export function TrashPage() {
  const { viewMode, setViewMode } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trash</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Deleted files can be restored within 30 days
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => {
            if (confirm('Are you sure you want to permanently delete all files in trash? This cannot be undone.')) {
              toast.error('Empty trash not yet implemented');
            }
          }}
        >
          Empty Trash
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search trash..."
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

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Trash aggregation coming soon
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            To view deleted files, open each box and filter by deleted status. A unified trash view that aggregates files from all boxes is planned for a future update.
          </p>
        </div>
      </div>

      {/* Content - Empty state for now */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
        <Trash2 className="mb-4 h-12 w-12 text-slate-400" />
        <h3 className="font-medium text-slate-900 dark:text-white">Trash is empty</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Deleted files will appear here
        </p>
      </div>
    </div>
  );
}
