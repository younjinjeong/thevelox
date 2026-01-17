import api from './api';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '@/types';

// Backend returns snake_case, frontend uses camelCase
interface BackendAuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

function mapAuthResponse(response: BackendAuthResponse): AuthResponse {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user,
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<BackendAuthResponse>('/auth/login', credentials);
    return mapAuthResponse(response.data);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<BackendAuthResponse>('/auth/register', data);
    return mapAuthResponse(response.data);
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<BackendAuthResponse>('/auth/refresh', { refreshToken });
    return mapAuthResponse(response.data);
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch<User>('/auth/profile', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  },

  getGoogleAuthUrl(): string {
    return `${api.defaults.baseURL}/auth/google`;
  },
};
