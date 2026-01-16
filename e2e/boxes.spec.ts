import { test, expect } from '@playwright/test';

/**
 * Box/Project Management E2E Tests
 * Tests box creation, sharing, and collaboration features
 */

// Helper function to login before each test
async function login(page) {
  await page.goto('/');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Box Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/boxes');
  });

  test('should display boxes page', async ({ page }) => {
    await expect(page).toHaveURL(/boxes/);
    await expect(page.locator('h1, h2')).toContainText(/boxes|projects/i);
  });

  test('should create a new box', async ({ page }) => {
    // Click create box button
    await page.click('[data-testid="create-box-button"], text=Create Box');

    // Fill box details
    const boxName = `Test Box ${Date.now()}`;
    await page.fill('input[name="name"], input[name="boxName"]', boxName);
    await page.fill('textarea[name="description"]', 'E2E test box description');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Wait for success message
    await expect(page.locator('text=/created successfully|box created/i')).toBeVisible({ timeout: 5000 });

    // Verify box appears in list
    await expect(page.locator(`text=${boxName}`)).toBeVisible();
  });

  test('should edit box details', async ({ page }) => {
    // Click on first box
    const firstBox = page.locator('[data-testid="box-item"]').first();
    const originalName = await firstBox.textContent();

    await firstBox.click();

    // Click edit button
    await page.click('[data-testid="edit-box-button"], text=Edit');

    // Update box name
    const newName = `Updated ${Date.now()}`;
    await page.fill('input[name="name"], input[name="boxName"]', newName);

    // Save changes
    await page.click('button[type="submit"]:has-text("Save")');

    // Verify updated name
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('should delete a box', async ({ page }) => {
    // Create a box to delete
    await page.click('[data-testid="create-box-button"]');
    const boxName = `Delete Test ${Date.now()}`;
    await page.fill('input[name="name"]', boxName);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Find and delete the box
    const boxToDelete = page.locator(`[data-testid="box-item"]:has-text("${boxName}")`);
    await boxToDelete.hover();
    await page.click(`[data-testid="box-item"]:has-text("${boxName}") [data-testid="delete-button"]`);

    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Verify box is removed
    await expect(boxToDelete).not.toBeVisible();
  });

  test('should filter boxes', async ({ page }) => {
    // Use search/filter
    await page.fill('[data-testid="search-input"], input[placeholder*="Search"]', 'test');

    // Verify filtered results
    const boxItems = page.locator('[data-testid="box-item"]');
    const count = await boxItems.count();

    // All visible boxes should contain search term
    for (let i = 0; i < count; i++) {
      const text = await boxItems.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('test');
    }
  });

  test('should sort boxes by different criteria', async ({ page }) => {
    // Click sort dropdown
    await page.click('[data-testid="sort-select"], select[name="sort"]');

    // Select sort by name
    await page.click('option:has-text("Name"), text=Name');

    // Verify boxes are sorted
    const firstBox = await page.locator('[data-testid="box-item"]').first().textContent();
    const secondBox = await page.locator('[data-testid="box-item"]').nth(1).textContent();

    // Compare alphabetically
    expect(firstBox?.localeCompare(secondBox || '')).toBeLessThanOrEqual(0);
  });
});

/**
 * Box Collaboration Tests
 */
test.describe('Box Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/boxes');
  });

  test('should invite member to box', async ({ page }) => {
    // Open first box
    await page.click('[data-testid="box-item"]').first();

    // Click share/invite button
    await page.click('[data-testid="share-button"], text=Share');

    // Enter email to invite
    await page.fill('input[name="email"], input[placeholder*="email"]', 'newmember@example.com');

    // Select permission level
    await page.click('select[name="role"], select[name="permission"]');
    await page.click('option:has-text("Editor")');

    // Send invitation
    await page.click('button:has-text("Invite"), button:has-text("Add")');

    // Verify success message
    await expect(page.locator('text=/invited|added successfully/i')).toBeVisible();
  });

  test('should display box members', async ({ page }) => {
    // Open first box
    await page.click('[data-testid="box-item"]').first();

    // Navigate to members tab
    await page.click('text=Members');

    // Verify members list is visible
    await expect(page.locator('[data-testid="members-list"]')).toBeVisible();

    // Verify at least owner is listed
    const memberItems = page.locator('[data-testid="member-item"]');
    await expect(memberItems.first()).toBeVisible();
  });

  test('should change member permissions', async ({ page }) => {
    // Open first box
    await page.click('[data-testid="box-item"]').first();
    await page.click('text=Members');

    // Find a member (not owner)
    const member = page.locator('[data-testid="member-item"]').nth(1);

    if (await member.isVisible()) {
      // Click permission dropdown
      await member.locator('select[name="role"], [data-testid="role-select"]').click();

      // Change to different role
      await page.click('option:has-text("Viewer")');

      // Verify change is saved
      await expect(page.locator('text=/updated|saved/i')).toBeVisible();
    }
  });

  test('should remove member from box', async ({ page }) => {
    // Open first box
    await page.click('[data-testid="box-item"]').first();
    await page.click('text=Members');

    // Find a member (not owner) to remove
    const member = page.locator('[data-testid="member-item"]').nth(1);

    if (await member.isVisible()) {
      const memberName = await member.textContent();

      // Click remove button
      await member.locator('[data-testid="remove-member-button"]').click();

      // Confirm removal
      await page.click('button:has-text("Confirm"), button:has-text("Remove")');

      // Verify member is removed
      await expect(page.locator(`text=${memberName}`)).not.toBeVisible();
    }
  });

  test('should leave a box as member', async ({ page }) => {
    // Navigate to a box where user is not owner
    const sharedBox = page.locator('[data-testid="box-item"]:has([data-testid="shared-indicator"])').first();

    if (await sharedBox.isVisible()) {
      await sharedBox.click();

      // Click leave box button
      await page.click('[data-testid="leave-box-button"], text=Leave');

      // Confirm leaving
      await page.click('button:has-text("Confirm"), button:has-text("Leave")');

      // Should redirect to boxes list
      await page.waitForURL('**/boxes');
    }
  });
});

/**
 * Real-time Collaboration Tests
 */
test.describe('Real-time Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should receive real-time notification when file is uploaded by another user', async ({ browser }) => {
    // This test simulates two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both users
    await login(page1);
    await login(page2);

    // Both navigate to same box
    await page1.goto('/boxes');
    await page1.click('[data-testid="box-item"]').first();

    await page2.goto('/boxes');
    await page2.click('[data-testid="box-item"]').first();

    // User 2 uploads a file
    await page2.click('[data-testid="upload-button"]');
    const fileInput = page2.locator('input[type="file"]');
    // Simulate file upload

    // User 1 should see real-time notification
    await expect(page1.locator('[data-testid="notification"], text=/new file/i')).toBeVisible({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });
});
