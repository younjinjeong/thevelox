# E2E Testing with Playwright

This directory contains end-to-end tests for the Velox application using Playwright.

## Setup

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

Run all tests:

```bash
npm run test:e2e
```

Run tests in UI mode (recommended for development):

```bash
npm run test:e2e:ui
```

Run tests in debug mode:

```bash
npm run test:e2e:debug
```

Run specific test file:

```bash
npx playwright test auth.spec.ts
```

Run tests in specific browser:

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

- `auth.spec.ts` - Authentication and authorization tests
- `files.spec.ts` - File upload, download, and management tests
- `boxes.spec.ts` - Box creation, sharing, and collaboration tests
- `helpers/` - Reusable helper functions
- `fixtures/` - Test files and data

## Configuration

Test configuration is in `playwright.config.ts` at the project root.

### Environment Variables

- `E2E_BASE_URL` - Base URL for the application (default: http://localhost:3000)

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Writing Tests

### Using Helpers

```typescript
import { login, createTestUser } from './helpers/auth.helper';
import { createApiHelper } from './helpers/api.helper';

test('my test', async ({ page }) => {
  // Login helper
  await login(page, 'test@example.com', 'password123');

  // API helper for setup
  const api = await createApiHelper(page);
  const box = await api.createBox(token, 'Test Box');
});
```

### Best Practices

1. Use data-testid attributes for reliable selectors
2. Clean up test data after tests
3. Use API helpers for test setup when possible
4. Keep tests independent and isolated
5. Use meaningful test descriptions

## CI/CD Integration

Tests are configured to run in CI environments. On CI:
- Tests run in series (not parallel)
- Retry failed tests 2 times
- Generate JUnit XML report for CI integration

## Troubleshooting

### Tests timing out

Increase timeout in test or config:

```typescript
test.setTimeout(60000); // 60 seconds
```

### Elements not found

Use `waitForSelector` or increase timeout:

```typescript
await page.waitForSelector('[data-testid="my-element"]', { timeout: 10000 });
```

### Debugging

Run with headed browser:

```bash
npx playwright test --headed
```

Run with debug mode:

```bash
npx playwright test --debug
```
