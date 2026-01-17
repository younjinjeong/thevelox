import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are required to access a route
 * @param roles - Array of role names required (e.g., 'admin', 'user')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
