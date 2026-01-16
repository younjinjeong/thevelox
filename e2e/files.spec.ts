import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * File Operations E2E Tests
 * Tests file upload, download, and management
 */

// Helper function to login before each test
async function login(page) {
  await page.goto('/');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should upload a file successfully', async ({ page }) => {
    // Navigate to a box or files page
    await page.goto('/boxes');

    // Select or create a box
    await page.click('[data-testid="box-item"]:first-child, text=Create Box');

    // If creating new box
    if (await page.locator('input[name="boxName"]').isVisible()) {
      await page.fill('input[name="boxName"]', 'Test Upload Box');
      await page.click('button[type="submit"]');
    }

    // Wait for box page
    await page.waitForTimeout(1000);

    // Click upload button
    await page.click('[data-testid="upload-button"], text=Upload');

    // Upload a test file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-file.txt');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await expect(page.locator('text=/upload complete|uploaded successfully/i')).toBeVisible({ timeout: 10000 });

    // Verify file appears in list
    await expect(page.locator('text=test-file.txt')).toBeVisible();
  });

  test('should display uploaded files in list', async ({ page }) => {
    await page.goto('/boxes');

    // Click on a box with files
    await page.click('[data-testid="box-item"]:first-child');

    // Verify files list is visible
    await expect(page.locator('[data-testid="files-list"]')).toBeVisible();

    // Verify at least one file is shown
    const fileItems = page.locator('[data-testid="file-item"]');
    await expect(fileItems.first()).toBeVisible();
  });

  test('should download a file', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Click on a file item
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]:first-child, [data-testid="file-item"]:first-child');

    const download = await downloadPromise;

    // Verify download started
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should delete a file', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Get first file name
    const fileName = await page.locator('[data-testid="file-item"]:first-child').textContent();

    // Click delete button
    await page.click('[data-testid="file-item"]:first-child [data-testid="delete-button"]');

    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Verify file is removed
    await expect(page.locator(`text=${fileName}`)).not.toBeVisible();
  });

  test('should show file details', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Click on file to view details
    await page.click('[data-testid="file-item"]:first-child');

    // Verify details panel or modal is visible
    await expect(page.locator('[data-testid="file-details"]')).toBeVisible();

    // Verify file metadata is shown
    await expect(page.locator('text=/size|modified|uploaded/i')).toBeVisible();
  });

  test('should handle large file upload', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout for large file

    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Click upload button
    await page.click('[data-testid="upload-button"]');

    // Upload a larger test file
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'large-file.pdf');
    await fileInput.setInputFiles(filePath);

    // Verify upload progress is shown
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=/upload complete/i')).toBeVisible({ timeout: 45000 });
  });

  test('should validate file type restrictions', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Try to upload restricted file type (if applicable)
    await page.click('[data-testid="upload-button"]');

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-executable.exe');
    await fileInput.setInputFiles(filePath);

    // Should show error message
    await expect(page.locator('text=/not allowed|invalid file type/i')).toBeVisible();
  });

  test('should search files', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Type in search box
    await page.fill('[data-testid="search-input"]', 'test');

    // Verify search results
    const fileItems = page.locator('[data-testid="file-item"]');
    const firstFile = await fileItems.first().textContent();
    expect(firstFile?.toLowerCase()).toContain('test');
  });
});

/**
 * File Versioning Tests
 */
test.describe('File Versioning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create new version when uploading existing file', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');

    // Upload file with same name
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-file.txt');
    await fileInput.setInputFiles(filePath);

    // Should show version conflict dialog or auto-create version
    const hasVersionDialog = await page.locator('text=/version|replace|keep both/i').isVisible();

    if (hasVersionDialog) {
      await page.click('button:has-text("Create Version"), button:has-text("Keep Both")');
    }

    // Verify version was created
    await page.click('[data-testid="file-item"]:has-text("test-file.txt")');
    await expect(page.locator('text=/version 2|v2/i')).toBeVisible();
  });

  test('should view version history', async ({ page }) => {
    await page.goto('/boxes');
    await page.click('[data-testid="box-item"]:first-child');
    await page.click('[data-testid="file-item"]:first-child');

    // Click version history button
    await page.click('[data-testid="version-history-button"], text=Versions');

    // Verify version list is shown
    await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
  });
});
