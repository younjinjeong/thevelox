import { Upload, Tag, Share2, StickyNote, MoreHorizontal, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Dropdown, DropdownItem } from '@/components/ui';

interface ToolboxProps {
  boxId: string;
  onUploadClick: () => void;
  onTagsClick: () => void;
  onShareClick: () => void;
  onNoteClick: () => void;
  onMembersClick?: () => void;
  memberCount?: number;
  onlineCount?: number;
  className?: string;
}

export function Toolbox({
  boxId: _boxId,
  onUploadClick,
  onTagsClick,
  onShareClick,
  onNoteClick,
  onMembersClick,
  memberCount = 0,
  onlineCount = 0,
  className,
}: ToolboxProps) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800',
        className
      )}
    >
      {/* Left: Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={onUploadClick}
        >
          Upload
        </Button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Tag className="h-4 w-4" />}
          onClick={onTagsClick}
        >
          Tags
        </Button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Share2 className="h-4 w-4" />}
          onClick={onShareClick}
        >
          Share
        </Button>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<StickyNote className="h-4 w-4" />}
          onClick={onNoteClick}
        >
          Note
        </Button>

        <Dropdown
          trigger={
            <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem icon={<Users className="h-4 w-4" />} onClick={onMembersClick}>
            Manage Members
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Right: Member info */}
      {(memberCount > 0 || onlineCount > 0) && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {onlineCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {onlineCount} online
            </span>
          )}
          {memberCount > 0 && (
            <button
              onClick={onMembersClick}
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Users className="h-4 w-4" />
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
