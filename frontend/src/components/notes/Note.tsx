import { useState, useRef, useEffect } from 'react';
import { Trash2, GripVertical, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Note as NoteType, NoteTheme } from '@/services/noteService';

interface NoteProps {
  note: NoteType;
  onUpdate?: (noteId: string, data: { text?: string; theme?: NoteTheme }) => void;
  onDelete?: (noteId: string) => void;
  onPositionChange?: (noteId: string, position: { top: number; left: number }) => void;
  onMarkAsRead?: (noteId: string) => void;
  isAuthor?: boolean;
  canDelete?: boolean;
}

const THEME_STYLES: Record<NoteTheme, { bg: string; border: string; shadow: string }> = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-300 dark:border-yellow-700',
    shadow: 'shadow-yellow-200/50 dark:shadow-yellow-900/30',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-300 dark:border-green-700',
    shadow: 'shadow-green-200/50 dark:shadow-green-900/30',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    border: 'border-red-300 dark:border-red-700',
    shadow: 'shadow-red-200/50 dark:shadow-red-900/30',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-300 dark:border-blue-700',
    shadow: 'shadow-blue-200/50 dark:shadow-blue-900/30',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    border: 'border-purple-300 dark:border-purple-700',
    shadow: 'shadow-purple-200/50 dark:shadow-purple-900/30',
  },
};

const ROTATION_STYLES: Record<string, string> = {
  left: '-rotate-2',
  right: 'rotate-2',
  '': '',
};

export function Note({
  note,
  onUpdate,
  onDelete,
  onPositionChange,
  onMarkAsRead,
  isAuthor = false,
  canDelete = false,
}: NoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(note.position);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const noteRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const themeStyle = THEME_STYLES[note.theme] || THEME_STYLES.yellow;
  const rotationStyle = ROTATION_STYLES[note.rotate] || '';

  useEffect(() => {
    setPosition(note.position);
  }, [note.position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    // Mark as read when clicked
    if (note.isUnread && onMarkAsRead) {
      onMarkAsRead(note.id);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const parent = noteRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const newLeft = Math.max(0, e.clientX - parentRect.left - dragOffset.current.x);
      const newTop = Math.max(0, e.clientY - parentRect.top - dragOffset.current.y);

      setPosition({ top: newTop, left: newLeft });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onPositionChange && (position.top !== note.position.top || position.left !== note.position.left)) {
        onPositionChange(note.id, position);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, note.id, note.position, onPositionChange]);

  const handleDoubleClick = () => {
    if (isAuthor) {
      setIsEditing(true);
      setEditText(note.text);
    }
  };

  const handleSaveEdit = () => {
    if (onUpdate && editText !== note.text) {
      onUpdate(note.id, { text: editText });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(note.text);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      ref={noteRef}
      className={clsx(
        'absolute w-56 rounded-lg border-2 p-3 shadow-lg transition-shadow',
        themeStyle.bg,
        themeStyle.border,
        themeStyle.shadow,
        rotationStyle,
        isDragging && 'cursor-grabbing shadow-xl z-50',
        !isDragging && 'cursor-grab hover:shadow-xl',
        note.isUnread && 'ring-2 ring-primary-500 ring-offset-2'
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header with drag handle and actions */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-slate-400" />
          {note.isUnread && (
            <Circle className="h-2 w-2 fill-primary-500 text-primary-500" />
          )}
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete?.(note.id)}
            className="rounded p-1 text-slate-400 hover:bg-white/50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full resize-none rounded border border-slate-300 bg-white/80 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={4}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={handleCancelEdit}
              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-white/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded bg-primary-500 px-2 py-1 text-xs text-white hover:bg-primary-600"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {note.text}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">{note.author.name}</span>
        <span>{formatDate(note.createdAt)}</span>
      </div>
    </div>
  );
}
