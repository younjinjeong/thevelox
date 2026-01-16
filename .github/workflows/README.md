# GitHub Actions CI/CD Workflows

This directory contains automated workflows for the Velox project.

## Workflows

### CI/CD Pipeline (`ci.yml`)

Complete continuous integration and deployment workflow that runs on every push and pull request.

#### Jobs

1. **Build**
   - Runs on Node.js 18.x and 20.x
   - Installs dependencies
   - Builds the application
   - Uploads build artifacts

2. **Unit Tests**
   - Runs Jest unit tests with coverage
   - Uploads coverage to Codecov
   - Generates coverage reports

3. **E2E Tests**
   - Runs Playwright E2E tests
   - Spins up MongoDB and Redis services
   - Tests across multiple browsers
   - Generates test reports

4. **Lint**
   - Runs ESLint
   - Checks TypeScript types
   - Validates code quality

5. **Security**
   - Runs npm audit
   - Scans for vulnerabilities with Snyk (optional)

6. **Deploy**
   - Pushes build artifacts to current branch
   - Only runs on successful builds
   - Skips CI on subsequent commits with `[skip ci]`

7. **Test Summary**
   - Generates comprehensive test summary
   - Downloads and aggregates all test artifacts

## Triggers

The workflow runs on:
- **Push** to `modernization`, `main`, `master`, or `develop` branches
- **Pull requests** targeting these branches

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Optional Secrets

- `SNYK_TOKEN` - For Snyk security scanning (optional)
- `CODECOV_TOKEN` - For Codecov integration (optional, public repos work without)

## Branch Protection

It's recommended to set up branch protection rules:

1. Go to repository **Settings** → **Branches**
2. Add rule for `main` or `master` branch
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required status checks:
     - `Build Application`
     - `Unit Tests`
     - `E2E Tests (Playwright)`

## Artifacts

The workflow generates the following artifacts:

- **build-artifacts** (1 day retention) - Compiled application
- **coverage-report** (7 days retention) - Test coverage reports
- **playwright-report** (7 days retention) - E2E test results
- **playwright-test-results** (7 days retention) - Detailed test results

## Viewing Results

### GitHub Actions UI

1. Go to the **Actions** tab in your repository
2. Click on a workflow run to see details
3. View job logs, test results, and artifacts

### Test Summary

After each run, view the test summary in the workflow run page. It includes:
- Overall test status
- Coverage percentage
- Links to detailed reports

### Downloading Artifacts

1. Navigate to the workflow run
2. Scroll to the **Artifacts** section
3. Click to download any artifact

## Local Testing

Before pushing, test locally to catch issues early:

```bash
# Run all checks locally
npm run lint
npm run build
npm test
npm run test:e2e
```

## Troubleshooting

### E2E Tests Failing

1. Ensure MongoDB and Redis services start correctly
2. Check `.env.test` configuration
3. Review Playwright logs in artifacts

### Build Failures

1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and reinstall
3. Check Node.js version compatibility

### Coverage Issues

1. Ensure all test files end with `.spec.ts`
2. Check Jest configuration in `package-nestjs.json`
3. Review coverage thresholds

### Deploy Job Not Running

1. Ensure previous jobs (build, tests) passed
2. Check that event is a `push` (not pull request)
3. Verify branch is in the trigger list

## Performance

Average workflow run time:
- **Build**: ~2 minutes
- **Unit Tests**: ~1 minute
- **E2E Tests**: ~3-5 minutes
- **Total**: ~6-8 minutes

## Optimization Tips

1. **Cache Dependencies**: Already configured with `cache: 'npm'`
2. **Parallel Jobs**: Jobs run in parallel where possible
3. **Conditional Steps**: Some steps skip on failure with `continue-on-error`
4. **Artifact Retention**: Set to reasonable durations to save storage

## Advanced Configuration

### Running on Specific Branches Only

Edit `ci.yml` to add/remove branches:

```yaml
on:
  push:
    branches:
      - main
      - develop
      # Add your branches here
```

### Adding More Node Versions

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add versions here
```

### Custom Environment Variables

Add to the job's `env` section:

```yaml
env:
  CUSTOM_VAR: value
  ANOTHER_VAR: ${{ secrets.SECRET_NAME }}
```

## Status Badge

Add this badge to your README.md:

```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/thevelox/workflows/CI/CD%20Pipeline/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

## Support

For issues with GitHub Actions:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Documentation](https://playwright.dev/docs/ci)
- [Jest CI Documentation](https://jestjs.io/docs/getting-started#using-babel)
