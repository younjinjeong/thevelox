#!/bin/bash

# Security Check Script for Velox
# Performs automated security checks on the codebase

echo "================================"
echo "Velox Security Check"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

echo "1. Checking for hardcoded secrets..."
echo "-----------------------------------"

# Check for potential secrets
if grep -r -E "(password|secret|api_key|apiKey|token)\s*=\s*['\"][^'\"]{8,}" src/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${RED}⚠️  WARNING: Potential hardcoded secrets found!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No hardcoded secrets detected${NC}"
fi

echo ""
echo "2. Checking for TODO security items..."
echo "---------------------------------------"

# Check for security TODOs
if grep -r -i "TODO.*secur\|FIXME.*secur" src/ --include="*.ts" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Security TODOs found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No security TODOs found${NC}"
fi

echo ""
echo "3. Checking for console.log statements..."
echo "------------------------------------------"

# Check for console.log that might leak sensitive data
LOG_COUNT=$(grep -r "console.log" src/ --include="*.ts" 2>/dev/null | wc -l)
if [ "$LOG_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $LOG_COUNT console.log statements${NC}"
    echo "   Review these to ensure no sensitive data is logged"
else
    echo -e "${GREEN}✓ No console.log statements found${NC}"
fi

echo ""
echo "4. Checking for .env files in git..."
echo "-------------------------------------"

if git ls-files | grep -E "\.env$|\.env\..*" 2>/dev/null; then
    echo -e "${RED}⚠️  WARNING: .env files tracked in git!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No .env files in version control${NC}"
fi

echo ""
echo "5. Checking for weak crypto algorithms..."
echo "------------------------------------------"

# Check for weak algorithms
if grep -r -E "(md5|sha1|des)" src/ --include="*.ts" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Weak cryptographic algorithms detected${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No weak crypto algorithms found${NC}"
fi

echo ""
echo "6. Checking for SQL injection risks..."
echo "---------------------------------------"

# Check for potential SQL injection
if grep -r "\.query\|\.raw\|\.execute" src/ --include="*.ts" 2>/dev/null | grep -v "// safe"; then
    echo -e "${YELLOW}⚠️  Potential raw queries found - verify parameterization${NC}"
else
    echo -e "${GREEN}✓ No obvious SQL injection risks${NC}"
fi

echo ""
echo "7. Checking TypeScript strict mode..."
echo "--------------------------------------"

if grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
    echo -e "${GREEN}✓ TypeScript strict mode enabled${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript strict mode not enabled${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
echo "8. Checking for HTTPS enforcement..."
echo "-------------------------------------"

if grep -r "http://" src/ --include="*.ts" | grep -v "localhost\|127.0.0.1\|//\|comment"; then
    echo -e "${YELLOW}⚠️  HTTP URLs found - ensure HTTPS in production${NC}"
else
    echo -e "${GREEN}✓ No hardcoded HTTP URLs${NC}"
fi

echo ""
echo "9. Checking authentication guards..."
echo "-------------------------------------"

CONTROLLER_COUNT=$(find src/modules -name "*.controller.ts" 2>/dev/null | wc -l)
GUARDED_COUNT=$(grep -r "@UseGuards" src/modules --include="*.controller.ts" 2>/dev/null | wc -l)

echo "   Controllers: $CONTROLLER_COUNT"
echo "   With guards: $GUARDED_COUNT"

if [ "$GUARDED_COUNT" -lt "$CONTROLLER_COUNT" ]; then
    echo -e "${YELLOW}⚠️  Some controllers may be missing auth guards${NC}"
else
    echo -e "${GREEN}✓ Most controllers have guards${NC}"
fi

echo ""
echo "10. Checking dependencies (if package-lock.json exists)..."
echo "-----------------------------------------------------------"

if [ -f "package-lock.json" ]; then
    if command -v npm &> /dev/null; then
        echo "Running npm audit..."
        npm audit --audit-level=moderate
        AUDIT_EXIT=$?
        if [ $AUDIT_EXIT -ne 0 ]; then
            echo -e "${RED}⚠️  npm audit found vulnerabilities${NC}"
            echo "   Run 'npm audit fix' to fix automatically"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            echo -e "${GREEN}✓ No vulnerabilities found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  npm not found, skipping dependency audit${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  package-lock.json not found${NC}"
    echo "   Run 'npm install' to generate lockfile"
fi

echo ""
echo "================================"
echo "Security Check Summary"
echo "================================"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Found $ISSUES_FOUND potential issues${NC}"
    echo ""
    echo "Review the warnings above and address any security concerns."
    echo "For detailed recommendations, see SECURITY_AUDIT.md"
    exit 1
fi
