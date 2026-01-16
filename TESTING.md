# Velox Testing Guide

This document covers all testing strategies and practices for the Velox project.

## Table of Contents

1. [Unit Tests (Jest)](#unit-tests-jest)
2. [E2E Tests (Playwright)](#e2e-tests-playwright)
3. [Test Coverage](#test-coverage)
4. [CI/CD Integration](#cicd-integration)
5. [Best Practices](#best-practices)

## Unit Tests (Jest)

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test users.service.spec.ts

# Run tests in debug mode
npm run test:debug
```

### Test Structure

Unit tests are located alongside source files with `.spec.ts` extension:

```
src/
  modules/
    users/
      users.service.ts
      users.service.spec.ts      # Unit tests here
    auth/
      auth.service.ts
      auth.service.spec.ts       # Unit tests here
```

### Writing Unit Tests

Example unit test structure:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const user = await service.findById('user_123');
      expect(user).toBeDefined();
      expect(user._id).toBe('user_123');
    });

    it('should throw NotFoundException if user not found', async () => {
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Mocking Dependencies

Use Jest mocks for external dependencies:

```typescript
const mockUserModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: getModelToken(User.name),
      useValue: mockUserModel,
    },
  ],
}).compile();
```

### Existing Unit Tests

- ✅ `users.service.spec.ts` - User management service tests
- ✅ `auth.service.spec.ts` - Authentication service tests
- ✅ `notifications.service.spec.ts` - Notifications service tests
- ✅ `activity.service.spec.ts` - Activity logging service tests

### Test Coverage Goals

- Minimum 80% code coverage
- 100% coverage for critical services (auth, users, files)
- All public methods should have tests
- Edge cases and error paths should be tested

## E2E Tests (Playwright)

### Running E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
```

### E2E Test Structure

E2E tests are in the `e2e/` directory:

```
e2e/
  auth.spec.ts           # Authentication tests
  boxes.spec.ts          # Box management tests
  files.spec.ts          # File operations tests
  helpers/
    auth.helper.ts       # Authentication helper functions
    api.helper.ts        # API helper functions
  fixtures/
    test-file.txt        # Test files for upload tests
```

### Writing E2E Tests

Example E2E test:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('**/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

### Using Test Helpers

```typescript
import { login } from './helpers/auth.helper';
import { createApiHelper } from './helpers/api.helper';

test('should create a box', async ({ page }) => {
  // Use helper to login
  await login(page, 'test@example.com', 'password123');

  // Use API helper for setup
  const api = await createApiHelper(page);
  const token = await api.login('test@example.com', 'password123');
  await api.createBox(token, 'Test Box');
});
```

### Existing E2E Tests

- ✅ Authentication flow (register, login, logout)
- ✅ Protected routes and authorization
- ✅ Box creation, editing, deletion
- ✅ Box collaboration and sharing
- ✅ File upload, download, delete
- ✅ File versioning
- ✅ Real-time collaboration notifications

### Test Environment

E2E tests run against a local development server:

```bash
# The application must be running
npm run start:dev

# Or configure webServer in playwright.config.ts to auto-start
```

Configure test environment in `playwright.config.ts`:

```typescript
export default defineConfig({
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run start:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Coverage

### Viewing Coverage Reports

After running tests with coverage:

```bash
npm run test:cov
```

Open the coverage report:

```bash
# HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows
xdg-open coverage/lcov-report/index.html  # Linux
```

### Coverage Thresholds

Configure in `package.json`:

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:cov
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### GitLab CI Example

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

unit-tests:
  stage: test
  image: node:18
  services:
    - mongo:7
    - redis:7
  script:
    - npm ci
    - npm run test:cov
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.1-focal
  services:
    - mongo:7
    - redis:7
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 30 days
```

## Best Practices

### Unit Testing Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Mock databases, APIs, services
3. **Descriptive Test Names**: Use clear, descriptive test names
4. **AAA Pattern**: Arrange, Act, Assert
5. **One Assertion Per Test**: Focus on testing one thing
6. **Test Edge Cases**: Test boundary conditions and error cases

### E2E Testing Best Practices

1. **Use Data Test IDs**: Add `data-testid` attributes for reliable selectors
2. **Clean Test Data**: Clean up test data after tests
3. **Use Helpers**: Reuse common operations (login, API calls)
4. **Wait Appropriately**: Use proper waits instead of arbitrary timeouts
5. **Test User Flows**: Test complete user journeys, not just individual pages
6. **Run Tests in Isolation**: Each test should create its own data

### Common Patterns

#### Testing Async Operations

```typescript
it('should create user asynchronously', async () => {
  const user = await service.create(createUserDto);
  expect(user).toBeDefined();
  expect(user.email).toBe(createUserDto.email);
});
```

#### Testing Exceptions

```typescript
it('should throw ConflictException for duplicate user', async () => {
  await expect(service.create(duplicateUser)).rejects.toThrow(ConflictException);
});
```

#### Testing with Timeouts

```typescript
it('should handle slow operations', async () => {
  const result = await service.slowOperation();
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

#### Page Object Pattern (E2E)

```typescript
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}

test('should login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
});
```

## Debugging Tests

### Debugging Unit Tests

```bash
# Run in debug mode
npm run test:debug

# In Chrome DevTools, go to chrome://inspect
# Click "inspect" on the Node process
# Set breakpoints and debug
```

### Debugging E2E Tests

```bash
# Run with headed browser
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run with UI mode (recommended)
npm run test:e2e:ui
```

## Performance Testing

For load testing and performance benchmarking, consider:

- **Artillery** - Load testing toolkit
- **k6** - Modern load testing tool
- **Apache JMeter** - Performance testing tool

Example Artillery config:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Upload file'
    flow:
      - post:
          url: '/auth/login'
          json:
            email: 'test@example.com'
            password: 'password123'
      - post:
          url: '/files/upload'
          formData:
            file: '@test-file.pdf'
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
