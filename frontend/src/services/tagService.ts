import api from './api';

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export interface BulkTagData {
  tagId: string;
  fileIds: string[];
}

export const tagService = {
  async getTags(boxId: string): Promise<Tag[]> {
    const response = await api.get<Tag[]>(`/tags/box/${boxId}`);
    return response.data;
  },

  async getTag(tagId: string): Promise<Tag> {
    const response = await api.get<Tag>(`/tags/${tagId}`);
    return response.data;
  },

  async createTag(boxId: string, data: CreateTagData): Promise<Tag> {
    const response = await api.post<Tag>(`/tags/box/${boxId}`, data);
    return response.data;
  },

  async updateTag(tagId: string, data: UpdateTagData): Promise<Tag> {
    const response = await api.put<Tag>(`/tags/${tagId}`, data);
    return response.data;
  },

  async deleteTag(tagId: string): Promise<void> {
    await api.delete(`/tags/${tagId}`);
  },

  async addTagToFiles(data: BulkTagData): Promise<{ updated: number }> {
    const response = await api.post<{ updated: number }>('/tags/bulk-add', data);
    return response.data;
  },

  async removeTagFromFiles(data: BulkTagData): Promise<{ updated: number }> {
    const response = await api.post<{ updated: number }>('/tags/bulk-remove', data);
    return response.data;
  },
};
