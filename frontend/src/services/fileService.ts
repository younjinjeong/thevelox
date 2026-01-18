import api from './api';
import type { FileItem, PaginatedResponse, ShareLink, Tag } from '@/types';

export interface FileQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  starred?: boolean;
  trashed?: boolean;
}

// Response wrapper for upload endpoint
interface FileUploadResponse {
  success: boolean;
  file?: FileItem;
  message?: string;
}

// Response wrapper for list endpoint with pagination
interface FileListResponse {
  files: FileItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fileService = {
  // Get files in a box - uses /files/box/:boxId
  async getFiles(boxId: string, params: FileQueryParams = {}): Promise<PaginatedResponse<FileItem>> {
    // The backend returns an array directly for /files/box/:boxId
    // For search with pagination, use /files/search
    if (params.search || params.page || params.limit) {
      const response = await api.get<FileListResponse>('/files/search', {
        params: {
          boxId,
          query: params.search,
          page: params.page || 1,
          limit: params.limit || 50,
          sortBy: params.sortField,
          sortOrder: params.sortOrder,
          includeDeleted: params.trashed,
        },
      });
      return {
        data: response.data.files,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
      };
    }

    // Simple list without pagination
    const response = await api.get<FileItem[]>(`/files/box/${boxId}`, {
      params: {
        includeDeleted: params.trashed,
      },
    });
    const total = response.data.length;
    return {
      data: response.data,
      total,
      page: 1,
      limit: total || 1,
      totalPages: 1,
    };
  },

  // Get single file details - uses /files/:id
  // boxId kept for API consistency but not used
  async getFile(_boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.get<FileItem>(`/files/${fileId}`);
    return response.data;
  },

  // Upload file - uses /files/upload with boxId in form data
  async uploadFile(
    boxId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('boxId', boxId);

    const response = await api.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    if (!response.data.success || !response.data.file) {
      throw new Error(response.data.message || 'Upload failed');
    }

    return response.data.file;
  },

  // Upload new version - uses /files/:id/version
  // boxId kept for API consistency but not used
  async uploadVersion(
    _boxId: string,
    fileId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<FileItem>(
      `/files/${fileId}/version`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );
    return response.data;
  },

  // Delete file (soft delete) - uses DELETE /files/:id
  async deleteFile(_boxId: string, fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`);
  },

  // Move to trash is same as soft delete
  async moveToTrash(_boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.delete<FileItem>(`/files/${fileId}`);
    return response.data;
  },

  // Restore from trash - uses POST /files/:id/restore
  async restoreFromTrash(_boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/files/${fileId}/restore`);
    return response.data;
  },

  // Copy file - uses POST /files/copy
  async copyFile(_boxId: string, fileId: string, targetBoxId: string): Promise<FileItem> {
    const response = await api.post<FileItem[]>('/files/copy', {
      fileIds: [fileId],
      destBoxId: targetBoxId,
      how: 'newitem',
    });
    return response.data[0];
  },

  // Move file - copy then delete original
  async moveFile(_boxId: string, fileId: string, targetBoxId: string): Promise<FileItem> {
    const response = await api.post<FileItem[]>('/files/copy', {
      fileIds: [fileId],
      destBoxId: targetBoxId,
      how: 'newitem',
    });
    // Delete original after successful copy
    await api.delete(`/files/${fileId}/permanent`);
    return response.data[0];
  },

  // Rename file - uses PUT /files/:id
  async renameFile(_boxId: string, fileId: string, name: string): Promise<FileItem> {
    const response = await api.put<FileItem>(`/files/${fileId}`, { name });
    return response.data;
  },

  // Toggle star - uses POST /files/:id/star
  async toggleStar(_boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/files/${fileId}/star`);
    return response.data;
  },

  // Get starred files - uses GET /files/starred
  async getStarredFiles(): Promise<FileItem[]> {
    const response = await api.get<FileItem[]>('/files/starred');
    return response.data;
  },

  // Get recent files - uses GET /files/recent
  async getRecentFiles(limit = 20): Promise<FileItem[]> {
    const response = await api.get<FileItem[]>('/files/recent', {
      params: { limit },
    });
    return response.data;
  },

  // Add tags - uses PUT /files/:id
  async addTags(_boxId: string, fileId: string, tags: string[]): Promise<FileItem> {
    const file = await api.get<FileItem>(`/files/${fileId}`);
    const existingTags = file.data.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];
    const response = await api.put<FileItem>(`/files/${fileId}`, { tags: newTags });
    return response.data;
  },

  // Remove tags - uses PUT /files/:id
  async removeTags(_boxId: string, fileId: string, tags: string[]): Promise<FileItem> {
    const file = await api.get<FileItem>(`/files/${fileId}`);
    const existingTags = file.data.tags || [];
    const newTags = existingTags.filter((t: string) => !tags.includes(t));
    const response = await api.put<FileItem>(`/files/${fileId}`, { tags: newTags });
    return response.data;
  },

  // Download URL - uses /files/:id/download
  getDownloadUrl(_boxId: string, fileId: string): string {
    return `${api.defaults.baseURL}/files/${fileId}/download`;
  },

  // Thumbnail URL (if backend supports it)
  getThumbnailUrl(_boxId: string, fileId: string): string {
    return `${api.defaults.baseURL}/files/${fileId}/thumbnail`;
  },

  // Share links - these may need backend implementation
  async createShareLink(
    _boxId: string,
    _fileId: string,
    _options?: { expiresIn?: number; password?: string; maxDownloads?: number }
  ): Promise<ShareLink> {
    // TODO: Implement when backend supports share links
    throw new Error('Share links not yet implemented');
  },

  async deleteShareLink(_boxId: string, _fileId: string, _linkId: string): Promise<void> {
    // TODO: Implement when backend supports share links
    throw new Error('Share links not yet implemented');
  },

  async getShareLinks(_boxId: string, _fileId: string): Promise<ShareLink[]> {
    // TODO: Implement when backend supports share links
    return [];
  },

  // Tags
  async getAllTags(): Promise<Tag[]> {
    const response = await api.get<Tag[]>('/tags');
    return response.data;
  },

  // Bulk operations - uses POST /files/bulk-delete and POST /files/bulk-restore
  async bulkDelete(_boxId: string, fileIds: string[]): Promise<void> {
    await api.post('/files/bulk-delete', { ids: fileIds });
  },

  async bulkMove(_boxId: string, fileIds: string[], targetBoxId: string): Promise<void> {
    await api.post('/files/copy', {
      fileIds,
      destBoxId: targetBoxId,
      how: 'newitem',
    });
    // Delete originals after copy
    await api.post('/files/bulk-delete', { ids: fileIds });
  },

  async bulkTrash(_boxId: string, fileIds: string[]): Promise<void> {
    await api.post('/files/bulk-delete', { ids: fileIds });
  },
};
