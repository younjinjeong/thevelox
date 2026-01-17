import api from './api';
import type { Box, CreateBoxData, PaginatedResponse, BoxMember } from '@/types';

export const boxService = {
  async getBoxes(page = 1, limit = 20): Promise<PaginatedResponse<Box>> {
    const response = await api.get<PaginatedResponse<Box>>('/boxes', {
      params: { page, limit },
    });
    return response.data;
  },

  async getBox(id: string): Promise<Box> {
    const response = await api.get<Box>(`/boxes/${id}`);
    return response.data;
  },

  async createBox(data: CreateBoxData): Promise<Box> {
    const response = await api.post<Box>('/boxes', data);
    return response.data;
  },

  async updateBox(id: string, data: Partial<CreateBoxData>): Promise<Box> {
    const response = await api.patch<Box>(`/boxes/${id}`, data);
    return response.data;
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
