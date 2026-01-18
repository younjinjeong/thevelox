import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface TagBadgeProps {
  name: string;
  color: string;
  count?: number;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
  selected?: boolean;
}

export function TagBadge({
  name,
  color,
  count,
  size = 'md',
  onRemove,
  onClick,
  selected = false,
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-all',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        selected && 'ring-2 ring-offset-1'
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
        ...(selected && { ringColor: color }),
      }}
      onClick={onClick}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
      {count !== undefined && (
        <span className="text-xs opacity-70">({count})</span>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
