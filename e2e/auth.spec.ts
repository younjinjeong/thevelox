import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests user registration, login, and authentication flows
 */

const TEST_USER = {
  name: 'e2etest',
  email: `e2etest-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Velox/i);
    await expect(page.locator('h1, h2')).toContainText(/login|sign in/i);
  });

  test('should register a new user', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Sign Up');

    // Fill registration form
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Assuming user already exists from previous test
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // Verify successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid credentials|login failed/i')).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/required|cannot be empty/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Click logout button
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Should redirect to login page
    await page.waitForURL('**/login');

    // Verify cookies/storage are cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name.includes('token') || c.name.includes('auth'));
    expect(authCookie).toBeUndefined();
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});

/**
 * Protected Routes Tests
 */
test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('**/login');
  });

  test('should access protected route after login', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Navigate to another protected route
    await page.goto('/boxes');

    // Should successfully access the route
    await expect(page).toHaveURL(/boxes/);
    await expect(page.locator('h1, h2')).toContainText(/boxes|projects/i);
  });
});
