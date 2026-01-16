import { SetMetadata } from '@nestjs/common';

/**
 * Cache TTL Decorator
 * Sets custom cache TTL for controller methods
 */
export const CACHE_TTL_KEY = 'cache_ttl';
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

/**
 * Cache Key Decorator
 * Sets custom cache key pattern for controller methods
 */
export const CACHE_KEY = 'cache_key';
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);

/**
 * No Cache Decorator
 * Disables caching for specific controller methods
 */
export const NO_CACHE_KEY = 'no_cache';
export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);
