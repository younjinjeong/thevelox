// User types
export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  photo?: string;
  role: 'user' | 'admin';
  locale: string;
  storageUsed: number;
  storageQuota: number;
  createdAt: string;
  updatedAt: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Box types
export interface Box {
  id: string;
  name: string;
  description?: string;
  owner: User;
  members: BoxMember[];
  color?: string;
  icon?: string;
  isPublic: boolean;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoxMember {
  user: User;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface CreateBoxData {
  name: string;
  description?: string;
  color?: string;
  isPublic?: boolean;
}

// File types
export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  extension: string;
  thumbnail?: string;
  boxId: string;
  uploadedBy: User;
  tags: string[];
  isStarred: boolean;
  isTrashed: boolean;
  version: number;
  versions?: FileVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  id: string;
  version: number;
  size: number;
  uploadedBy: User;
  createdAt: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Note types
export interface Note {
  id: string;
  boxId: string;
  content: string;
  createdBy: User;
  lastEditedBy?: User;
  createdAt: string;
  updatedAt: string;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  color: string;
  fileCount: number;
}

// Share types
export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  expiresAt?: string;
  password?: string;
  downloadCount: number;
  maxDownloads?: number;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// WebSocket event types
export interface SocketEvent {
  type: 'file_uploaded' | 'file_deleted' | 'file_moved' | 'user_joined' | 'user_left' | 'note_updated';
  data: unknown;
  boxId: string;
  userId: string;
  timestamp: string;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

// View types
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'size' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface ViewSettings {
  mode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  showHidden: boolean;
}
