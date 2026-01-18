import api from './api';

// Types for admin API
export interface AdminUser {
  _id: string;
  name: string;
  username?: string;
  email: string;
  status: 1 | 2;
  roles: string[];
  availableSize: number;
  usedSize: number;
  locale: string;
  createDate: string;
  lastLoginDate?: string;
  lastLoginIp?: string;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface StorageSettings {
  provider: 's3' | 'gcs' | 'minio' | 'openstack';
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  gcs?: {
    projectId: string;
    credentials: string;
    bucket: string;
  };
  minio?: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    useSSL: boolean;
    region?: string;
  };
  openstack?: {
    authUrl: string;
    tenantId: string;
    username: string;
    password: string;
    container: string;
  };
}

export interface SystemSettings {
  _id: string;
  storage: StorageSettings;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export const adminService = {
  // ==================== Settings ====================

  async getSettings(): Promise<SystemSettings> {
    const response = await api.get<SystemSettings>('/admin/settings');
    return response.data;
  },

  async getStorageSettings(): Promise<StorageSettings> {
    const response = await api.get<StorageSettings>('/admin/settings/storage');
    return response.data;
  },

  async updateStorageSettings(settings: StorageSettings): Promise<StorageSettings> {
    const response = await api.put<StorageSettings>('/admin/settings/storage', settings);
    return response.data;
  },

  async testStorageConnection(settings: StorageSettings): Promise<TestConnectionResult> {
    const response = await api.post<TestConnectionResult>('/admin/settings/storage/test', settings);
    return response.data;
  },

  // ==================== Users ====================

  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    status?: number,
  ): Promise<AdminUserListResponse> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (status !== undefined) params.append('status', String(status));

    const response = await api.get<AdminUserListResponse>(`/admin/users?${params}`);
    return response.data;
  },

  async getUser(id: string): Promise<AdminUser> {
    const response = await api.get<AdminUser>(`/admin/users/${id}`);
    return response.data;
  },

  async createUser(data: {
    email: string;
    name: string;
    username?: string;
    password: string;
    roles?: string[];
    availableSize?: number;
  }): Promise<AdminUser> {
    const response = await api.post<AdminUser>('/admin/users', data);
    return response.data;
  },

  async updateUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await api.patch<AdminUser>(`/admin/users/${id}`, data);
    return response.data;
  },

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/admin/users/${id}/reset-password`, { newPassword });
  },

  async enableUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/enable`);
  },

  async disableUser(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/disable`);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
};
