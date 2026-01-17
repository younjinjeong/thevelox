import {
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Presentation,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FileIconProps {
  mimeType: string;
  extension?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const iconMap: Record<string, typeof File> = {
  // Images
  'image/': FileImage,
  // Videos
  'video/': FileVideo,
  // Audio
  'audio/': FileAudio,
  // Documents
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml': FileText,
  'text/plain': FileText,
  'text/markdown': FileText,
  // Spreadsheets
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml': FileSpreadsheet,
  'text/csv': FileSpreadsheet,
  // Presentations
  'application/vnd.ms-powerpoint': Presentation,
  'application/vnd.openxmlformats-officedocument.presentationml': Presentation,
  // Code
  'text/html': FileCode,
  'text/css': FileCode,
  'text/javascript': FileCode,
  'application/javascript': FileCode,
  'application/json': FileCode,
  'application/xml': FileCode,
  // Archives
  'application/zip': FileArchive,
  'application/x-rar': FileArchive,
  'application/x-7z-compressed': FileArchive,
  'application/gzip': FileArchive,
  'application/x-tar': FileArchive,
};

const colorMap: Record<string, string> = {
  'image/': 'text-purple-500',
  'video/': 'text-red-500',
  'audio/': 'text-orange-500',
  'application/pdf': 'text-red-600',
  'application/msword': 'text-blue-600',
  'application/vnd.openxmlformats-officedocument.wordprocessingml': 'text-blue-600',
  'text/plain': 'text-slate-500',
  'text/markdown': 'text-slate-600',
  'application/vnd.ms-excel': 'text-green-600',
  'application/vnd.openxmlformats-officedocument.spreadsheetml': 'text-green-600',
  'text/csv': 'text-green-500',
  'application/vnd.ms-powerpoint': 'text-orange-600',
  'application/vnd.openxmlformats-officedocument.presentationml': 'text-orange-600',
  'text/html': 'text-orange-500',
  'text/css': 'text-blue-500',
  'text/javascript': 'text-yellow-500',
  'application/javascript': 'text-yellow-500',
  'application/json': 'text-yellow-600',
  'application/xml': 'text-purple-600',
  'application/zip': 'text-amber-600',
  'application/x-rar': 'text-amber-600',
  'application/x-7z-compressed': 'text-amber-600',
  'application/gzip': 'text-amber-600',
  'application/x-tar': 'text-amber-600',
};

function getIconAndColor(mimeType: string): { Icon: typeof File; color: string } {
  // Check for exact match first
  if (iconMap[mimeType]) {
    return { Icon: iconMap[mimeType], color: colorMap[mimeType] || 'text-slate-500' };
  }

  // Check for prefix match
  for (const prefix of Object.keys(iconMap)) {
    if (mimeType.startsWith(prefix)) {
      return { Icon: iconMap[prefix], color: colorMap[prefix] || 'text-slate-500' };
    }
  }

  return { Icon: File, color: 'text-slate-500' };
}

export function FileIcon({ mimeType, size = 'md', className }: FileIconProps) {
  const { Icon, color } = getIconAndColor(mimeType);

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return <Icon className={clsx(sizes[size], color, className)} />;
}
