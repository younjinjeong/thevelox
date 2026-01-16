# CI/CD Pipeline Documentation

![CI/CD Pipeline](https://github.com/younjinjeong/thevelox/workflows/CI/CD%20Pipeline/badge.svg)

This document describes the continuous integration and deployment setup for the Velox project.

## Overview

The Velox project uses GitHub Actions for automated testing, building, and deployment. Every push and pull request triggers a comprehensive pipeline that ensures code quality and functionality.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Push/PR                          │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │    Build     │ │     Lint     │ │   Security   │
    │  (Node 18/20)│ │   & Format   │ │     Scan     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌──────────────┐ ┌──────────────┐
│  Unit Tests  │ │  E2E Tests   │
│    (Jest)    │ │ (Playwright) │
└──────────────┘ └──────────────┘
    │                │
    └───────┬────────┘
            │
            ▼
    ┌──────────────┐
    │ Test Summary │
    │   & Deploy   │
    └──────────────┘
            │
            ▼
    ┌──────────────┐
    │ Push to      │
    │ Branch       │
    └──────────────┘
```

## Workflow Jobs

### 1. Build (`build`)

**Purpose**: Compile the TypeScript application and verify build succeeds

**Matrix Strategy**: Tests on Node.js 18.x and 20.x

**Steps**:
1. Checkout code
2. Setup Node.js with caching
3. Install dependencies (`npm ci`)
4. Build application (`npm run build`)
5. Upload build artifacts (Node 20.x only)

**Duration**: ~2 minutes

**Artifacts**:
- `build-artifacts` - Compiled JavaScript in `dist/` directory

### 2. Unit Tests (`unit-tests`)

**Purpose**: Run Jest unit tests with coverage reporting

**Dependencies**: Requires `build` job to complete

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run tests with coverage (`npm run test:cov`)
5. Upload coverage to Codecov
6. Upload coverage report as artifact

**Duration**: ~1 minute

**Coverage Requirements**:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

**Artifacts**:
- `coverage-report` - HTML and LCOV coverage reports

### 3. E2E Tests (`e2e-tests`)

**Purpose**: Run end-to-end tests with Playwright across multiple browsers

**Dependencies**: Requires `build` job to complete

**Services**:
- **MongoDB 7**: Test database on port 27017
- **Redis 7**: Cache service on port 6379

**Steps**:
1. Checkout code
2. Setup Node.js
3. Start MongoDB and Redis services
4. Install dependencies
5. Install Playwright browsers
6. Create test environment configuration
7. Run E2E tests (`npm run test:e2e`)
8. Upload test reports and results

**Duration**: ~3-5 minutes

**Browsers Tested**:
- Chromium
- Firefox
- WebKit (Safari)

**Artifacts**:
- `playwright-report` - HTML test report
- `playwright-test-results` - Detailed test results

### 4. Lint (`lint`)

**Purpose**: Validate code quality and TypeScript types

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run ESLint (`npm run lint`)
5. Check TypeScript compilation

**Duration**: ~1 minute

**Note**: Continues on error to not block pipeline

### 5. Security (`security`)

**Purpose**: Scan for security vulnerabilities

**Steps**:
1. Checkout code
2. Setup Node.js
3. Run `npm audit` for known vulnerabilities
4. Run Snyk security scan (optional)

**Duration**: ~1 minute

**Note**: Continues on error, requires `SNYK_TOKEN` secret for Snyk integration

### 6. Deploy (`deploy`)

**Purpose**: Push build artifacts back to repository

**Dependencies**: Requires `build`, `unit-tests`, and `e2e-tests` to succeed

**Conditions**: Only runs on push events (not PRs)

**Steps**:
1. Checkout code with full history
2. Configure Git user
3. Download build artifacts
4. Commit artifacts if changed
5. Push to current branch

**Duration**: ~30 seconds

**Note**: Commits are marked with `[skip ci]` to prevent recursive builds

### 7. Test Summary (`test-summary`)

**Purpose**: Aggregate test results and generate summary

**Dependencies**: Runs after `unit-tests` and `e2e-tests` (always runs)

**Steps**:
1. Download all test artifacts
2. Generate GitHub Actions summary
3. Display test results

**Duration**: ~30 seconds

## Environment Configuration

### Test Environment Variables

The E2E tests use these environment variables (automatically configured):

```env
NODE_ENV=test
PORT=3000
MONGODB_URI=mongodb://root:password@localhost:27017/velox_test?authSource=admin
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-secret-key-for-ci
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
STORAGE_PROVIDER=mock
CORS_ORIGIN=http://localhost:3000
E2E_BASE_URL=http://localhost:3000
```

### Required Secrets

Configure in repository settings under **Settings** → **Secrets and variables** → **Actions**:

| Secret | Required | Purpose |
|--------|----------|---------|
| `GITHUB_TOKEN` | ✅ Auto | Git operations, automatically provided |
| `SNYK_TOKEN` | ❌ Optional | Snyk security scanning |
| `CODECOV_TOKEN` | ❌ Optional | Codecov integration (not needed for public repos) |

## Artifacts Retention

| Artifact | Retention | Size |
|----------|-----------|------|
| build-artifacts | 1 day | ~5-10 MB |
| coverage-report | 7 days | ~2-5 MB |
| playwright-report | 7 days | ~10-20 MB |
| playwright-test-results | 7 days | ~5-10 MB |

## Triggers

The workflow runs on:

### Push Events
```yaml
branches:
  - modernization
  - main
  - master
  - develop
```

### Pull Request Events
```yaml
branches:
  - modernization
  - main
  - master
  - develop
```

## Branch Protection

Recommended branch protection rules for `main`/`master`:

1. **Require status checks to pass**:
   - ✅ Build Application (Node 20.x)
   - ✅ Unit Tests
   - ✅ E2E Tests (Playwright)

2. **Require branches to be up to date**

3. **Require linear history** (optional)

4. **Require pull request reviews** (optional)

## Local Development

Before pushing, run these commands locally to catch issues early:

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Build application
npm run build

# Run unit tests
npm test

# Run unit tests with coverage
npm run test:cov

# Run E2E tests (requires services running)
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

## Viewing Results

### GitHub Actions Tab

1. Navigate to your repository
2. Click **Actions** tab
3. Select a workflow run
4. View job logs and results

### Test Reports

**Coverage Report**:
1. Click on completed workflow run
2. Scroll to **Artifacts** section
3. Download `coverage-report`
4. Open `index.html` in browser

**Playwright Report**:
1. Download `playwright-report` artifact
2. Unzip and open `index.html`
3. View test results with screenshots/videos

### Codecov Integration

If configured, view coverage trends at:
`https://codecov.io/gh/younjinjeong/thevelox`

## Performance Metrics

Average workflow run times:

| Job | Duration | Notes |
|-----|----------|-------|
| Build | ~2 min | Parallel on 2 Node versions |
| Unit Tests | ~1 min | 47 tests |
| E2E Tests | ~3-5 min | 20+ scenarios, 3 browsers |
| Lint | ~1 min | ESLint + TypeScript |
| Security | ~1 min | npm audit + Snyk |
| Deploy | ~30 sec | Only on push |
| **Total** | **~6-8 min** | All jobs in parallel |

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**E2E Test Failures**
- Check MongoDB/Redis service health in logs
- Verify `.env.test` configuration
- Review Playwright screenshots in artifacts

**Coverage Drops**
- Ensure new code has tests
- Check coverage report for uncovered lines
- Update tests to meet 80% threshold

**Deploy Job Skipped**
- Verify all previous jobs passed
- Ensure event is `push` (not PR)
- Check branch is in trigger list

### Debug Mode

Enable debug logging in workflows:

1. Go to **Settings** → **Secrets**
2. Add secret: `ACTIONS_STEP_DEBUG` = `true`
3. Re-run workflow

## Optimization Tips

1. **Dependency Caching**: Already enabled with `cache: 'npm'`
2. **Parallel Execution**: Jobs run in parallel where possible
3. **Artifact Cleanup**: Set retention to reasonable periods
4. **Conditional Jobs**: Use `if` conditions to skip unnecessary runs
5. **Matrix Strategy**: Test on multiple Node versions simultaneously

## Advanced Configuration

### Add Custom Job

```yaml
custom-job:
  name: Custom Task
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run custom script
      run: npm run custom-script
```

### Add Deployment to Production

```yaml
deploy-production:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [build, unit-tests, e2e-tests]
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to server
      run: |
        # Deployment script here
```

### Add Slack Notifications

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  if: always()
```

## CI/CD Best Practices

1. ✅ **Run tests on every push** - Catch issues early
2. ✅ **Use branch protection** - Prevent breaking changes
3. ✅ **Cache dependencies** - Speed up workflows
4. ✅ **Parallel jobs** - Reduce total runtime
5. ✅ **Artifact retention** - Balance storage costs
6. ✅ **Security scanning** - Detect vulnerabilities
7. ✅ **Code coverage** - Maintain quality standards
8. ✅ **Clear naming** - Descriptive job and step names

## Monitoring

### Workflow Success Rate

Track over time in **Actions** → **Workflows** → **CI/CD Pipeline**

### Build Times

Monitor job duration to identify performance issues

### Test Flakiness

Review failed E2E tests for intermittent failures

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [Jest CI Configuration](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

## Support

For CI/CD issues:
- Check [workflow logs](https://github.com/younjinjeong/thevelox/actions)
- Review [workflow configuration](.github/workflows/ci.yml)
- Open an issue with workflow run URL

---

**Last Updated**: 2026-01-17
**Workflow Version**: 1.0.0
**Maintainer**: Velox Team
