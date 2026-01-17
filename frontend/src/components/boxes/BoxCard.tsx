import { Link } from 'react-router-dom';
import { Folder, MoreVertical, Settings, Trash2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { Dropdown, DropdownItem, DropdownDivider, Avatar } from '@/components/ui';
import type { Box } from '@/types';

interface BoxCardProps {
  box: Box;
  onDelete?: (boxId: string) => void;
  onShare?: (box: Box) => void;
}

export function BoxCard({ box, onDelete, onShare }: BoxCardProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const boxColors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
  };

  return (
    <Link
      to={`/boxes/${box.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              boxColors[box.color || 'blue'] || 'bg-primary-500'
            )}
          >
            <Folder className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">{box.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {box.fileCount} files • {formatBytes(box.totalSize)}
            </p>
          </div>
        </div>

        <Dropdown
          trigger={
            <button
              onClick={(e) => e.preventDefault()}
              className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem
            icon={<Share2 className="h-4 w-4" />}
            onClick={() => onShare?.(box)}
          >
            Share
          </DropdownItem>
          <DropdownItem icon={<Settings className="h-4 w-4" />}>
            <Link to={`/boxes/${box.id}/settings`}>Settings</Link>
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => onDelete?.(box.id)}
            danger
          >
            Delete
          </DropdownItem>
        </Dropdown>
      </div>

      {box.description && (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
          {box.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {box.members.slice(0, 3).map((member) => (
            <Avatar
              key={member.user.id}
              src={member.user.photo}
              name={member.user.name}
              size="sm"
              className="-ml-2 first:ml-0 ring-2 ring-white dark:ring-slate-800"
            />
          ))}
          {box.members.length > 3 && (
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
              +{box.members.length - 3}
            </span>
          )}
        </div>

        <span className="text-xs text-slate-400 dark:text-slate-500">
          {format(new Date(box.updatedAt), 'MMM d, yyyy')}
        </span>
      </div>
    </Link>
  );
}
