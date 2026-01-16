import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  StorageProvider,
  ObjectMetadata,
  UploadResult,
  ContainerInfo,
  AclConfig,
  CreateContainerOptions,
} from '../interfaces/storage-provider.interface';
import { Readable } from 'stream';

interface KeystoneTokenResponse {
  access: {
    token: {
      id: string;
      expires: string;
    };
    serviceCatalog: Array<{
      endpoints: Array<{
        publicURL: string;
      }>;
    }>;
    user: {
      id: string;
    };
  };
}

interface CachedToken {
  token: string;
  storageUrl: string;
  expires: Date;
  userId: string;
}

/**
 * OpenStack Swift Storage Provider
 *
 * This provider integrates with OpenStack Swift for object storage.
 * It uses Keystone v2.0 for authentication and Swift API for storage operations.
 *
 * Migrated from:
 * - app/services/openstack/keystone.js
 * - app/services/openstack/swift.js
 * - app/services/openstack/container.js
 */
@Injectable()
export class OpenstackSwiftProvider implements StorageProvider {
  private readonly logger = new Logger(OpenstackSwiftProvider.name);
  private readonly authUrl: string;
  private readonly tenantId: string;
  private readonly username: string;
  private readonly password: string;
  private readonly httpClient: AxiosInstance;

  // Global token cache for operator/admin credentials
  private static operatorTokenCache: CachedToken | null = null;

  // Instance token cache for member credentials
  private memberTokenCache: CachedToken | null = null;

  constructor(private configService: ConfigService) {
    this.authUrl = configService.get<string>('app.storage.openstack.authUrl');
    this.tenantId = configService.get<string>('app.storage.openstack.tenantId');
    this.username = configService.get<string>('app.storage.openstack.username');
    this.password = configService.get<string>('app.storage.openstack.password');

    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Initialized OpenStack Swift provider with auth URL: ${this.authUrl}`);
  }

  /**
   * Authenticate with Keystone and get token
   * Migrated from keystone.js:setAuth()
   */
  private async authenticate(username: string, password: string): Promise<CachedToken> {
    try {
      const response = await this.httpClient.post<KeystoneTokenResponse>(
        `${this.authUrl}/tokens`,
        {
          auth: {
            tenantName: 'service',
            passwordCredentials: {
              username,
              password,
            },
          },
        },
      );

      if (!response.data.access) {
        throw new Error('Invalid authentication response from Keystone');
      }

      const { access } = response.data;
      const storageEndpoint = access.serviceCatalog[0]?.endpoints[0]?.publicURL;

      if (!storageEndpoint) {
        throw new Error('No storage endpoint found in service catalog');
      }

      return {
        token: access.token.id,
        storageUrl: storageEndpoint,
        expires: new Date(access.token.expires),
        userId: access.user.id,
      };
    } catch (error) {
      this.logger.error(`Keystone authentication failed: ${error.message}`);
      throw new Error(`OpenStack authentication failed: ${error.message}`);
    }
  }

  /**
   * Get operator/admin token (cached globally)
   * Migrated from keystone.js:operatorTokens()
   */
  private async getOperatorToken(): Promise<CachedToken> {
    // Check global cache
    if (
      OpenstackSwiftProvider.operatorTokenCache &&
      OpenstackSwiftProvider.operatorTokenCache.expires > new Date()
    ) {
      this.logger.debug('Using cached operator token');
      return OpenstackSwiftProvider.operatorTokenCache;
    }

    this.logger.debug('Fetching new operator token');
    const token = await this.authenticate(this.username, this.password);
    OpenstackSwiftProvider.operatorTokenCache = token;
    return token;
  }

  /**
   * Get member token (for specific user credentials)
   * Migrated from keystone.js:memberTokens()
   */
  private async getMemberToken(username: string, password: string): Promise<CachedToken> {
    if (this.memberTokenCache && this.memberTokenCache.expires > new Date()) {
      this.logger.debug('Using cached member token');
      return this.memberTokenCache;
    }

    this.logger.debug('Fetching new member token');
    const token = await this.authenticate(username, password);
    this.memberTokenCache = token;
    return token;
  }

  /**
   * Get current token (uses operator credentials)
   */
  private async getToken(): Promise<CachedToken> {
    return this.getOperatorToken();
  }

  /**
   * Create a container/bucket
   * Migrated from swift.js:createContainer()
   */
  async createContainer(name: string, options?: CreateContainerOptions): Promise<void> {
    try {
      const token = await this.getToken();

      await this.httpClient.put(`${token.storageUrl}/${name}`, null, {
        headers: {
          'X-Auth-Token': token.token,
        },
      });

      this.logger.log(`Created Swift container: ${name}`);

      // Set ACL if provided
      if (options?.acl) {
        await this.setContainerAcl(name, options.acl);
      }
    } catch (error) {
      if (error.response?.status === 202) {
        // Container already exists
        this.logger.debug(`Container ${name} already exists`);
        return;
      }
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  /**
   * Delete a container/bucket
   * Migrated from swift.js:removeContainer()
   */
  async deleteContainer(name: string): Promise<void> {
    const token = await this.getToken();

    await this.httpClient.delete(`${token.storageUrl}/${name}`, {
      headers: {
        'X-Auth-Token': token.token,
      },
    });

    this.logger.log(`Deleted Swift container: ${name}`);
  }

  /**
   * List all containers
   * Migrated from swift.js:getContainers()
   */
  async listContainers(): Promise<ContainerInfo[]> {
    const token = await this.getToken();

    const response = await this.httpClient.get(`${token.storageUrl}?format=json`, {
      headers: {
        'X-Auth-Token': token.token,
      },
    });

    return (response.data || []).map((container: any) => ({
      name: container.name,
      objectCount: container.count,
      size: container.bytes,
    }));
  }

  /**
   * Set container ACL
   * Migrated from swift.js:SetContainerACL() and container.js:SetAcl()
   */
  async setContainerAcl(name: string, acl: AclConfig): Promise<void> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'X-Auth-Token': token.token,
    };

    // Swift ACL format: service:username,service:username2
    if (acl.readUsers && acl.readUsers.length > 0) {
      headers['X-Container-Read'] = acl.readUsers.map(u => `service:${u}`).join(',');
    }

    if (acl.writeUsers && acl.writeUsers.length > 0) {
      headers['X-Container-Write'] = acl.writeUsers.map(u => `service:${u}`).join(',');
    }

    if (acl.public) {
      headers['X-Container-Read'] = '.r:*';
    }

    await this.httpClient.post(`${token.storageUrl}/${name}`, null, { headers });
    this.logger.debug(`Set ACL for container: ${name}`);
  }

  /**
   * Check if container exists
   * Migrated from swift.js:Containerinfo()
   */
  async containerExists(name: string): Promise<boolean> {
    try {
      const token = await this.getToken();

      await this.httpClient.head(`${token.storageUrl}/${name}`, {
        headers: {
          'X-Auth-Token': token.token,
        },
      });

      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Upload an object
   * Migrated from swift.js:upload()
   */
  async upload(
    container: string,
    key: string,
    stream: Readable,
    metadata?: ObjectMetadata,
  ): Promise<UploadResult> {
    const token = await this.getToken();

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    const headers: Record<string, string> = {
      'X-Auth-Token': token.token,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(key)}"`,
    };

    if (metadata?.contentType) {
      headers['Content-Type'] = metadata.contentType;
    }

    // Add custom metadata with X-Object-Meta- prefix
    if (metadata?.customMetadata) {
      Object.entries(metadata.customMetadata).forEach(([metaKey, value]) => {
        headers[`X-Object-Meta-${metaKey}`] = value;
      });
    }

    const response = await this.httpClient.put(
      `${token.storageUrl}/${container}/${key}`,
      body,
      { headers },
    );

    return {
      key,
      etag: response.headers.etag,
      location: `${token.storageUrl}/${container}/${key}`,
      size: body.length,
    };
  }

  /**
   * Download an object
   * Migrated from swift.js:download()
   */
  async download(container: string, key: string): Promise<Readable> {
    const token = await this.getToken();

    const response = await this.httpClient.get(
      `${token.storageUrl}/${container}/${key}`,
      {
        headers: {
          'X-Auth-Token': token.token,
        },
        responseType: 'stream',
      },
    );

    return response.data as Readable;
  }

  /**
   * Delete an object
   * Migrated from swift.js:deleteObject()
   */
  async delete(container: string, key: string): Promise<void> {
    const token = await this.getToken();

    await this.httpClient.delete(`${token.storageUrl}/${container}/${key}`, {
      headers: {
        'X-Auth-Token': token.token,
      },
    });

    this.logger.debug(`Deleted object: ${key} from container: ${container}`);
  }

  /**
   * Copy an object
   * Migrated from swift.js:copyObject()
   */
  async copy(
    sourceContainer: string,
    sourceKey: string,
    destContainer: string,
    destKey: string,
  ): Promise<void> {
    const token = await this.getToken();

    await this.httpClient.put(
      `${token.storageUrl}/${destContainer}/${destKey}`,
      null,
      {
        headers: {
          'X-Auth-Token': token.token,
          'X-Copy-From': `/${sourceContainer}/${sourceKey}`,
        },
      },
    );

    this.logger.debug(`Copied object from ${sourceContainer}/${sourceKey} to ${destContainer}/${destKey}`);
  }

  /**
   * Get object metadata
   * Uses Swift HEAD request
   */
  async getMetadata(container: string, key: string): Promise<ObjectMetadata> {
    const token = await this.getToken();

    const response = await this.httpClient.head(
      `${token.storageUrl}/${container}/${key}`,
      {
        headers: {
          'X-Auth-Token': token.token,
        },
      },
    );

    const customMetadata: Record<string, string> = {};
    Object.entries(response.headers).forEach(([headerKey, value]) => {
      if (headerKey.toLowerCase().startsWith('x-object-meta-')) {
        const metaKey = headerKey.substring('x-object-meta-'.length);
        customMetadata[metaKey] = value as string;
      }
    });

    return {
      contentType: response.headers['content-type'],
      contentLength: parseInt(response.headers['content-length'], 10),
      etag: response.headers.etag,
      lastModified: new Date(response.headers['last-modified']),
      customMetadata,
    };
  }

  /**
   * Set object metadata
   * Migrated from swift.js:SetHeaders()
   */
  async setMetadata(container: string, key: string, metadata: ObjectMetadata): Promise<void> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'X-Auth-Token': token.token,
    };

    if (metadata.contentType) {
      headers['Content-Type'] = metadata.contentType;
    }

    if (metadata.customMetadata) {
      Object.entries(metadata.customMetadata).forEach(([metaKey, value]) => {
        headers[`X-Object-Meta-${metaKey}`] = value;
      });
    }

    await this.httpClient.post(`${token.storageUrl}/${container}/${key}`, null, {
      headers,
    });
  }

  /**
   * Check if object exists
   */
  async exists(container: string, key: string): Promise<boolean> {
    try {
      await this.getMetadata(container, key);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get signed/temporary URL for object
   * Swift uses TempURL for this functionality
   */
  async getSignedUrl(container: string, key: string, expiresIn: number): Promise<string> {
    const token = await this.getToken();

    // Note: Swift TempURL requires additional setup with a secret key
    // For now, return the direct URL (requires authentication)
    // TODO: Implement proper TempURL if Swift TempURL secret is configured

    this.logger.warn('Swift TempURL not fully implemented, returning direct URL');
    return `${token.storageUrl}/${container}/${key}`;
  }

  /**
   * List objects in a container
   * Migrated from swift.js:getContainer()
   */
  async listObjects(container: string, prefix?: string): Promise<string[]> {
    const token = await this.getToken();
    let url = `${token.storageUrl}/${container}?format=json`;

    if (prefix) {
      url += `&prefix=${encodeURIComponent(prefix)}`;
    }

    const response = await this.httpClient.get(url, {
      headers: {
        'X-Auth-Token': token.token,
      },
    });

    return (response.data || []).map((obj: any) => obj.name);
  }

  /**
   * Create a user in Keystone (admin operation)
   * Migrated from keystone.js:createUser()
   */
  async createUser(username: string, password: string): Promise<string> {
    const token = await this.getOperatorToken();

    const response = await this.httpClient.post(
      `${this.authUrl}/users`,
      {
        user: {
          name: username,
          password: password,
          tenantId: this.tenantId,
          enabled: true,
        },
      },
      {
        headers: {
          'X-Auth-Token': token.token,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.user.id;
  }

  /**
   * Update user in Keystone (admin operation)
   * Migrated from keystone.js:updateUser()
   */
  async updateUser(userId: string, username: string, password: string): Promise<void> {
    const token = await this.getOperatorToken();

    await this.httpClient.put(
      `${this.authUrl}/users/${userId}`,
      {
        user: {
          name: username,
          password: password,
          tenantId: this.tenantId,
          enabled: true,
        },
      },
      {
        headers: {
          'X-Auth-Token': token.token,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  /**
   * Delete user from Keystone (admin operation)
   * Migrated from keystone.js:deleteUser()
   */
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getOperatorToken();

    await this.httpClient.delete(`${this.authUrl}/users/${userId}`, {
      headers: {
        'X-Auth-Token': token.token,
      },
    });
  }

  /**
   * List all users in Keystone (admin operation)
   * Migrated from keystone.js:users()
   */
  async listUsers(): Promise<any[]> {
    const token = await this.getOperatorToken();

    const response = await this.httpClient.get(`${this.authUrl}/users`, {
      headers: {
        'X-Auth-Token': token.token,
        'Content-Type': 'application/json',
      },
    });

    return response.data.users || [];
  }
}
