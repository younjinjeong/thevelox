import { Page, APIRequestContext } from '@playwright/test';

/**
 * API helper functions for E2E tests
 * Provides direct API access for test setup and teardown
 */

export class ApiHelper {
  constructor(private request: APIRequestContext, private baseURL: string = 'http://localhost:3000') {}

  /**
   * Create a user via API
   */
  async createUser(name: string, email: string, password: string) {
    const response = await this.request.post(`${this.baseURL}/auth/register`, {
      data: { name, email, password },
    });
    return response.json();
  }

  /**
   * Login and get auth token
   */
  async login(email: string, password: string): Promise<string> {
    const response = await this.request.post(`${this.baseURL}/auth/login`, {
      data: { email, password },
    });
    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create a box via API
   */
  async createBox(token: string, name: string, description?: string) {
    const response = await this.request.post(`${this.baseURL}/boxes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: { name, description },
    });
    return response.json();
  }

  /**
   * Delete a box via API
   */
  async deleteBox(token: string, boxId: string) {
    const response = await this.request.delete(`${this.baseURL}/boxes/${boxId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status() === 200 || response.status() === 204;
  }

  /**
   * Upload a file via API
   */
  async uploadFile(token: string, boxId: string, filePath: string, fileName: string) {
    const response = await this.request.post(`${this.baseURL}/files/upload`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      multipart: {
        file: {
          name: fileName,
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('test file content'),
        },
        boxId,
      },
    });
    return response.json();
  }

  /**
   * Delete a file via API
   */
  async deleteFile(token: string, fileId: string) {
    const response = await this.request.delete(`${this.baseURL}/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status() === 200 || response.status() === 204;
  }

  /**
   * Get user profile
   */
  async getUserProfile(token: string) {
    const response = await this.request.get(`${this.baseURL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  }

  /**
   * Cleanup - delete test user data
   */
  async cleanupTestData(token: string, userId: string) {
    // Delete all test boxes
    const boxesResponse = await this.request.get(`${this.baseURL}/boxes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (boxesResponse.ok()) {
      const boxes = await boxesResponse.json();
      for (const box of boxes) {
        await this.deleteBox(token, box._id);
      }
    }
  }
}

/**
 * Create API helper instance from page context
 */
export async function createApiHelper(page: Page): Promise<ApiHelper> {
  const request = page.context().request;
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  return new ApiHelper(request, baseURL);
}
