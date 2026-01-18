import api from './api';
import type { Box, CreateBoxData, PaginatedResponse, BoxMember } from '@/types';

// Map backend BoxResponseDto to frontend Box type
function mapBoxResponse(box: any): Box {
  return {
    id: box.id,
    name: box.name,
    description: box.description,
    owner: box.owner,
    members: box.members || [],
    color: box.color,
    icon: box.icon,
    isPublic: box.isPublic || false,
    fileCount: box.fileLength || 0,
    totalSize: box.size || 0,
    createdAt: box.createDate,
    updatedAt: box.lastModifyDate,
  };
}

export const boxService = {
  async getBoxes(_page = 1, _limit = 20): Promise<PaginatedResponse<Box>> {
    // Backend returns array directly, not paginated response
    const response = await api.get<any[]>('/boxes', {
      params: { includeArchived: false },
    });
    const boxes = (response.data || []).map(mapBoxResponse);
    return {
      data: boxes,
      total: boxes.length,
      page: 1,
      limit: boxes.length,
      totalPages: 1,
    };
  },

  async getBox(id: string): Promise<Box> {
    const response = await api.get<any>(`/boxes/${id}`);
    return mapBoxResponse(response.data);
  },

  async createBox(data: CreateBoxData): Promise<Box> {
    const response = await api.post<any>('/boxes', data);
    return mapBoxResponse(response.data);
  },

  async updateBox(id: string, data: Partial<CreateBoxData>): Promise<Box> {
    // Backend uses PUT, not PATCH
    const response = await api.put<any>(`/boxes/${id}`, data);
    return mapBoxResponse(response.data);
  },

  async deleteBox(id: string): Promise<void> {
    await api.delete(`/boxes/${id}`);
  },

  async getBoxMembers(boxId: string): Promise<BoxMember[]> {
    const response = await api.get<BoxMember[]>(`/boxes/${boxId}/members`);
    return response.data;
  },

  async addBoxMember(boxId: string, email: string, role: 'editor' | 'viewer'): Promise<BoxMember> {
    const response = await api.post<BoxMember>(`/boxes/${boxId}/members`, { email, role });
    return response.data;
  },

  async updateBoxMember(boxId: string, userId: string, role: 'editor' | 'viewer'): Promise<BoxMember> {
    const response = await api.patch<BoxMember>(`/boxes/${boxId}/members/${userId}`, { role });
    return response.data;
  },

  async removeBoxMember(boxId: string, userId: string): Promise<void> {
    await api.delete(`/boxes/${boxId}/members/${userId}`);
  },

  async leaveBox(boxId: string): Promise<void> {
    await api.post(`/boxes/${boxId}/leave`);
  },
};
