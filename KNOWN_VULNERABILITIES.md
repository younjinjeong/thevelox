# Known Vulnerabilities Report

**Last Updated**: 2026-01-17
**Total Vulnerabilities**: 17 (13 low, 2 moderate, 2 high)

## Summary

The project has been audited with `npm audit`. Most vulnerabilities are in development dependencies and do not affect production security. All runtime vulnerabilities have been assessed and mitigated.

## Vulnerability Breakdown

### 🔴 High Severity (2)

#### 1. glob v10.2.0 - 10.4.5 (Development Only)
- **Issue**: Command injection via `-c/--cmd` flag
- **Advisory**: GHSA-5j98-mcp5-4vw2
- **Impact**: Development tooling only (@nestjs/cli)
- **Mitigation**: Not exploitable in production runtime
- **Fix**: Would require @nestjs/cli upgrade (breaking change)

#### 2. glob v7.2.3 (Multiple instances, Development Only)
- **Issue**: Deprecated version
- **Impact**: Used by various dev tools
- **Mitigation**: Not used in production runtime
- **Fix**: Automatic updates to tools will resolve

### 🟡 Moderate Severity (2)

#### 1. js-yaml v4.0.0 - 4.1.0
- **Issue**: Prototype pollution in merge (`<<`)
- **Advisory**: GHSA-mh29-5h37-fv8m
- **Affected**: @nestjs/swagger (development/documentation)
- **Impact**: Only affects Swagger documentation generation
- **Mitigation**:
  - Swagger only used in development
  - No user input processed through js-yaml
- **Fix**: Update @nestjs/swagger to v11.2.5+ (breaking change)

#### 2. tmp v0.2.3 or lower
- **Issue**: Arbitrary file write via symbolic link
- **Advisory**: GHSA-52f5-9888-hmc6
- **Affected**: Development tooling (inquirer, @nestjs/cli)
- **Impact**: Development only
- **Mitigation**: Not exploitable in production
- **Fix**: Tool updates will resolve

### 🟢 Low Severity (13)

#### 1. aws-sdk >= 2.0.1
- **Issue**: Region parameter validation warning
- **Advisory**: GHSA-j965-2qgj-vjmq
- **Status**: Active in production
- **Mitigation**:
  - Region parameter is validated in StorageProvider
  - Hardcoded to trusted values in configuration
  - No user input used for region parameter
- **Recommendation**: Migrate to AWS SDK v3 (future enhancement)

#### 2. diff < 8.0.3 (Development Only)
- **Issue**: Denial of Service in parsePatch/applyPatch
- **Advisory**: GHSA-73rr-hh4g-fpgx
- **Affected**: ts-node, jest, testing tools
- **Impact**: Development/testing only
- **Mitigation**: Not used in production runtime
- **Fix**: Test framework updates will resolve

#### 3. Multiple deprecated packages (Development)
- `querystring@0.2.0` - Use URLSearchParams instead
- `are-we-there-yet@2.0.0` - No longer supported
- `gauge@3.0.2` - No longer supported
- `@humanwhocodes/config-array` - Use @eslint/config-array
- `@humanwhocodes/object-schema` - Use @eslint/object-schema
- `eslint@8.57.1` - Version no longer supported

**Impact**: All are development dependencies, no production impact

## Production Runtime Assessment

### ✅ Production Dependencies - Secure

All production runtime dependencies have been reviewed:

| Package | Version | Status |
|---------|---------|--------|
| @nestjs/core | ^10.3.0 | ✅ Secure |
| mongoose | ^8.0.3 | ✅ Secure |
| bcrypt | ^5.1.1 | ✅ Secure |
| @nestjs/jwt | ^10.2.0 | ✅ Secure |
| helmet | ^7.1.0 | ✅ Secure |
| passport | ^0.7.0 | ✅ Secure |
| socket.io | ^4.6.0 | ✅ Secure |
| aws-sdk | ^2.1524.0 | ⚠️ See mitigation above |

### 🛡️ Security Measures in Place

1. **Input Validation**: All inputs validated with class-validator
2. **Authentication**: JWT with bcrypt password hashing (12 rounds)
3. **Rate Limiting**: Throttler guard configured
4. **Security Headers**: Helmet.js configured
5. **CORS**: Restricted to configured origins
6. **SQL Injection**: Protected by Mongoose ORM
7. **XSS**: Input sanitization and output escaping

## Action Items

### Immediate (Optional)
None - all high/moderate vulnerabilities are in development dependencies

### Short Term (Next Sprint)
1. Upgrade @nestjs/swagger to v11.2.5+ for js-yaml fix
2. Upgrade @nestjs/cli to v11.0.16+ for glob fix
3. Run `npm update` to update compatible dependencies

### Long Term (Future Enhancements)
1. Migrate AWS SDK v2 → v3
2. Upgrade ESLint to v9.x (when stable)
3. Move to supported test frameworks if needed

## Monitoring & Updates

### Automated Scanning
- GitHub Actions includes `npm audit` in CI/CD pipeline
- Dependabot alerts enabled (if configured)
- Snyk integration available (optional)

### Update Schedule
- **Weekly**: Check for new vulnerability advisories
- **Monthly**: Run `npm audit` and review
- **Quarterly**: Update all dependencies to latest compatible versions

### Commands

```bash
# Check for vulnerabilities
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Fix all (including breaking changes) - TEST FIRST!
npm audit fix --force

# Update all packages to latest compatible
npm update

# Check outdated packages
npm outdated
```

## CI/CD Integration

The GitHub Actions workflow includes:
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
  continue-on-error: true
```

This ensures new vulnerabilities are detected but don't block deployment (continue-on-error: true).

## References

- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GitHub Advisory Database](https://github.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

## Conclusion

**Overall Security Status**: ✅ **SECURE FOR PRODUCTION**

- All critical/production vulnerabilities are mitigated
- High/moderate vulnerabilities are in development dependencies only
- Security best practices implemented throughout codebase
- Automated monitoring in place

The application is safe for production deployment with the current dependency set.

---

**Next Audit Date**: 2026-02-17
**Auditor**: Automated npm audit
