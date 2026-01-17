import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Folder, Clock, Star, Upload, Plus, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { boxService } from '@/services/boxService';
import { BoxCard } from '@/components/boxes';
import { Button } from '@/components/ui';

export function HomePage() {
  const { user } = useAuthStore();
  const { setCreateBoxModalOpen, setUploadModalOpen } = useUIStore();

  const { data: boxesData } = useQuery({
    queryKey: ['boxes'],
    queryFn: () => boxService.getBoxes(1, 6),
  });

  const recentBoxes = boxesData?.data || [];

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storageUsedPercent = user
    ? Math.round((user.storageUsed / user.storageQuota) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.displayName || user?.name || 'User'}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Here's what's happening with your files
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateBoxModalOpen(true)}
          >
            New Box
          </Button>
          <Button
            leftIcon={<Upload className="h-4 w-4" />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {boxesData?.total || 0}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Boxes</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Recent Files</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">--</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Starred Files</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Storage Used
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {storageUsedPercent}%
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${storageUsedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {user ? `${formatBytes(user.storageUsed)} of ${formatBytes(user.storageQuota)}` : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent boxes */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Boxes
          </h2>
          <Link
            to="/boxes"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentBoxes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentBoxes.map((box) => (
              <BoxCard key={box.id} box={box} />
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
      </div>
    </div>
  );
}
