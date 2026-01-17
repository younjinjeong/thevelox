import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Settings,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { boxService } from '@/services/boxService';
import { fileService } from '@/services/fileService';
import { useUIStore } from '@/stores/uiStore';
import { FileGrid, FileList, FileUpload } from '@/components/files';
import { Button, Input, Dropdown, DropdownItem, Avatar } from '@/components/ui';
import type { FileItem } from '@/types';

export function BoxDetailPage() {
  const { boxId } = useParams<{ boxId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { viewMode, setViewMode, uploadModalOpen, setUploadModalOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: box, isLoading: boxLoading } = useQuery({
    queryKey: ['box', boxId],
    queryFn: () => boxService.getBox(boxId!),
    enabled: !!boxId,
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', boxId],
    queryFn: () => fileService.getFiles(boxId!, { limit: 100 }),
    enabled: !!boxId,
  });

  const files = filesData?.data || [];
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileClick = (file: FileItem) => {
    // TODO: Open file preview modal
    console.log('Open file:', file);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['files', boxId] });
  };

  if (boxLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!box) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Box not found</h2>
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
            <DropdownItem icon={<Users className="h-4 w-4" />}>Manage Members</DropdownItem>
            <DropdownItem icon={<Settings className="h-4 w-4" />}>Box Settings</DropdownItem>
          </Dropdown>

          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="max-w-sm flex-1">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <button className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:block">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredFiles.length} files
          </span>
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
      </div>

      {/* Files */}
      {filesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            boxId={boxId!}
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        ) : (
          <FileList
            files={filteredFiles}
            boxId={boxId!}
            onFileClick={handleFileClick}
            onRefresh={handleRefresh}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 dark:border-slate-700 dark:bg-slate-800/50">
          <Upload className="mb-4 h-12 w-12 text-slate-400" />
          {searchQuery ? (
            <>
              <h3 className="font-medium text-slate-900 dark:text-white">No files found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Try a different search term
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <FileUpload
        boxId={boxId!}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleRefresh}
      />
    </div>
  );
}
