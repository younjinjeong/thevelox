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

export const fileService = {
  async getFiles(boxId: string, params: FileQueryParams = {}): Promise<PaginatedResponse<FileItem>> {
    const response = await api.get<PaginatedResponse<FileItem>>(`/boxes/${boxId}/files`, {
      params,
    });
    return response.data;
  },

  async getFile(boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.get<FileItem>(`/boxes/${boxId}/files/${fileId}`);
    return response.data;
  },

  async uploadFile(
    boxId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<FileItem>(`/boxes/${boxId}/files/upload`, formData, {
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
    return response.data;
  },

  async uploadVersion(
    boxId: string,
    fileId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<FileItem>(
      `/boxes/${boxId}/files/${fileId}/versions`,
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

  async deleteFile(boxId: string, fileId: string): Promise<void> {
    await api.delete(`/boxes/${boxId}/files/${fileId}`);
  },

  async moveToTrash(boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/trash`);
    return response.data;
  },

  async restoreFromTrash(boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/restore`);
    return response.data;
  },

  async copyFile(boxId: string, fileId: string, targetBoxId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/copy`, {
      targetBoxId,
    });
    return response.data;
  },

  async moveFile(boxId: string, fileId: string, targetBoxId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/move`, {
      targetBoxId,
    });
    return response.data;
  },

  async renameFile(boxId: string, fileId: string, name: string): Promise<FileItem> {
    const response = await api.patch<FileItem>(`/boxes/${boxId}/files/${fileId}`, { name });
    return response.data;
  },

  async toggleStar(boxId: string, fileId: string): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/star`);
    return response.data;
  },

  async addTags(boxId: string, fileId: string, tags: string[]): Promise<FileItem> {
    const response = await api.post<FileItem>(`/boxes/${boxId}/files/${fileId}/tags`, { tags });
    return response.data;
  },

  async removeTags(boxId: string, fileId: string, tags: string[]): Promise<FileItem> {
    const response = await api.delete<FileItem>(`/boxes/${boxId}/files/${fileId}/tags`, {
      data: { tags },
    });
    return response.data;
  },

  getDownloadUrl(boxId: string, fileId: string): string {
    return `${api.defaults.baseURL}/boxes/${boxId}/files/${fileId}/download`;
  },

  getThumbnailUrl(boxId: string, fileId: string): string {
    return `${api.defaults.baseURL}/boxes/${boxId}/files/${fileId}/thumbnail`;
  },

  // Share links
  async createShareLink(boxId: string, fileId: string, options?: {
    expiresIn?: number;
    password?: string;
    maxDownloads?: number;
  }): Promise<ShareLink> {
    const response = await api.post<ShareLink>(`/boxes/${boxId}/files/${fileId}/share`, options);
    return response.data;
  },

  async deleteShareLink(boxId: string, fileId: string, linkId: string): Promise<void> {
    await api.delete(`/boxes/${boxId}/files/${fileId}/share/${linkId}`);
  },

  async getShareLinks(boxId: string, fileId: string): Promise<ShareLink[]> {
    const response = await api.get<ShareLink[]>(`/boxes/${boxId}/files/${fileId}/share`);
    return response.data;
  },

  // Tags
  async getAllTags(): Promise<Tag[]> {
    const response = await api.get<Tag[]>('/tags');
    return response.data;
  },

  // Bulk operations
  async bulkDelete(boxId: string, fileIds: string[]): Promise<void> {
    await api.post(`/boxes/${boxId}/files/bulk/delete`, { fileIds });
  },

  async bulkMove(boxId: string, fileIds: string[], targetBoxId: string): Promise<void> {
    await api.post(`/boxes/${boxId}/files/bulk/move`, { fileIds, targetBoxId });
  },

  async bulkTrash(boxId: string, fileIds: string[]): Promise<void> {
    await api.post(`/boxes/${boxId}/files/bulk/trash`, { fileIds });
  },
};
