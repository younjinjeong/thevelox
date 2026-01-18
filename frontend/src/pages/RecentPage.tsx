import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Grid, List, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { fileService } from '@/services/fileService';
import { useUIStore } from '@/stores/uiStore';
import { FileGrid, FileList } from '@/components/files';
import { Input } from '@/components/ui';
import type { FileItem } from '@/types';

export function RecentPage() {
  const queryClient = useQueryClient();
  const { viewMode, setViewMode } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', 'recent'],
    queryFn: () => fileService.getRecentFiles(50),
  });

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileClick = (file: FileItem) => {
    // TODO: Open file preview modal
    console.log('Open file:', file);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['files', 'recent'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Files</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Recently modified files across all your boxes
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search recent files..."
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
      ) : filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            boxId=""
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        ) : (
          <FileList
            files={filteredFiles}
            boxId=""
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
          <Clock className="mb-4 h-12 w-12 text-slate-400" />
          {searchQuery ? (
            <>
              <h3 className="font-medium text-slate-900 dark:text-white">No recent files found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try a different search term
              </p>
            </>
          ) : (
            <>
              <h3 className="font-medium text-slate-900 dark:text-white">No recent files</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Files you've recently accessed will appear here
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
