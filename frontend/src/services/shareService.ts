import { api } from './api';

export interface ShareLink {
  id: string;
  file: string;
  token: string;
  url: string;
  createdBy: string;
  createdByName?: string;
  expiresAt?: string;
  hasPassword: boolean;
  downloadLimit: number;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateShareLinkRequest {
  expiresAt?: Date;
  password?: string;
  downloadLimit?: number;
}

export interface PublicFileInfo {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  hasPassword: boolean;
}

export const shareService = {
  // Create a share link for a file
  createShareLink: async (fileId: string, data: CreateShareLinkRequest): Promise<ShareLink> => {
    const response = await api.post(`/files/${fileId}/share`, data);
    return response.data;
  },

  // Get all share links for a file
  getShareLinks: async (fileId: string): Promise<ShareLink[]> => {
    const response = await api.get(`/files/${fileId}/share`);
    return response.data;
  },

  // Delete a share link
  deleteShareLink: async (fileId: string, linkId: string): Promise<void> => {
    await api.delete(`/files/${fileId}/share/${linkId}`);
  },

  // Public: Get shared file info
  getPublicFileInfo: async (token: string): Promise<PublicFileInfo> => {
    const response = await api.get(`/public/share/${token}`);
    return response.data;
  },

  // Public: Download shared file
  downloadSharedFile: async (token: string, password?: string): Promise<void> => {
    const url = password
      ? `/public/share/${token}/download`
      : `/public/share/${token}/download`;

    const response = await api.get(url, {
      params: password ? { password } : undefined,
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    // Extract filename from content-disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
