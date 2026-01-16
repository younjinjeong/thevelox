import { Page } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/**
 * Login helper function
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 5000 });
}

/**
 * Register helper function
 */
export async function register(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 5000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL('**/login');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const userMenu = page.locator('[data-testid="user-menu"]');
    return await userMenu.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Get auth token from cookies or storage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  // Try to get from cookies first
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name.includes('token') || c.name.includes('auth'));

  if (authCookie) {
    return authCookie.value;
  }

  // Try localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  });

  return token;
}

/**
 * Create a test user with unique credentials
 */
export function createTestUser(prefix = 'e2etest'): TestUser {
  const timestamp = Date.now();
  return {
    name: `${prefix}_${timestamp}`,
    email: `${prefix}_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };
}
