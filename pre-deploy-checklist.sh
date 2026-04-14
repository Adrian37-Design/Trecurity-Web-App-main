#!/bin/bash

##############################################################################
# Trecurity Pre-Deployment Checklist Script
# This script verifies all prerequisites before deployment
##############################################################################

set -e  # Exit on error

echo "========================================="
echo "Trecurity Pre-Deployment Checklist"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check command existence
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check version
check_node_version() {
    if check_command node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            echo -e "  ${GREEN}→${NC} Node.js version: $(node -v) (OK)"
        else
            echo -e "  ${RED}→${NC} Node.js version: $(node -v) (Requires v18+)"
            ERRORS=$((ERRORS + 1))
        fi
    fi
}

echo "1. Checking System Dependencies..."
echo "-----------------------------------"
check_command git
check_command node
check_node_version
check_command npm
check_command mysql

# Check PM2
if check_command pm2; then
    echo -e "  ${GREEN}→${NC} PM2 version: $(pm2 -v)"
else
    echo -e "  ${YELLOW}→${NC} PM2 not installed. Install with: npm install -g pm2"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "2. Checking MySQL Database..."
echo "-----------------------------------"

# Extract database credentials from environment
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:?'DB_PASS must be set'}"
DB_NAME="${DB_NAME:-trecurity}"
DB_HOST="${DB_HOST:-localhost}"

# Test MySQL connection
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓${NC} MySQL server is accessible"
    
    # Check if database exists
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" &> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database '$DB_NAME' exists"
        
        # Count tables
        TABLE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASS" -D"$DB_NAME" -e "SHOW TABLES;" -sN | wc -l)
        echo -e "  ${GREEN}→${NC} Tables in database: $TABLE_COUNT"
    else
        echo -e "${YELLOW}⚠${NC} Database '$DB_NAME' does not exist"
        echo -e "  ${YELLOW}→${NC} It will be created during migration"
    fi
else
    echo -e "${RED}✗${NC} Cannot connect to MySQL server"
    echo -e "  ${RED}→${NC} Check credentials: User=$DB_USER, Host=$DB_HOST"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "3. Checking Port Availability..."
echo "-----------------------------------"

# Check if port 3000 is available
if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${YELLOW}⚠${NC} Port 3000 is already in use"
    echo -e "  ${YELLOW}→${NC} You may need to stop the existing service"
    EXISTING_PID=$(lsof -ti:3000 2>/dev/null || echo "unknown")
    if [ "$EXISTING_PID" != "unknown" ]; then
        echo -e "  ${YELLOW}→${NC} Process using port 3000: PID $EXISTING_PID"
    fi
else
    echo -e "${GREEN}✓${NC} Port 3000 is available"
fi

echo ""
echo "4. Checking Disk Space..."
echo "-----------------------------------"

AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo -e "${GREEN}✓${NC} Available disk space: $AVAILABLE_SPACE"

# Check if we have at least 1GB free
AVAILABLE_KB=$(df -k . | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_KB" -lt 1048576 ]; then
    echo -e "${YELLOW}⚠${NC} Less than 1GB free space available"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "5. Checking Environment Variables..."
echo "-----------------------------------"

# Check for .env.production file
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓${NC} .env.production file exists"
    
    # Check for critical variables
    REQUIRED_VARS="DATABASE_URL NUXT_JWT_APP_TOKEN_SECRET NUXT_RECAPTCHA_SERVER_SITE_KEY"
    for VAR in $REQUIRED_VARS; do
        if grep -q "^$VAR=" .env.production; then
            echo -e "  ${GREEN}→${NC} $VAR is set"
        else
            echo -e "  ${RED}→${NC} $VAR is NOT set"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${RED}✗${NC} .env.production file not found"
    ERRORS=$((ERRORS + 1))
fi

# Check ecosystem.config.cjs
if [ -f "ecosystem.config.cjs" ]; then
    echo -e "${GREEN}✓${NC} ecosystem.config.cjs exists"
else
    echo -e "${RED}✗${NC} ecosystem.config.cjs not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "6. Checking Application Files..."
echo "-----------------------------------"

if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
else
    echo -e "${RED}✗${NC} package.json not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "nuxt.config.ts" ]; then
    echo -e "${GREEN}✓${NC} nuxt.config.ts exists"
else
    echo -e "${RED}✗${NC} nuxt.config.ts not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "prisma" ]; then
    echo -e "${GREEN}✓${NC} prisma directory exists"
    
    if [ -f "prisma/schema.prisma" ]; then
        echo -e "  ${GREEN}→${NC} schema.prisma found"
    else
        echo -e "  ${RED}→${NC} schema.prisma NOT found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} prisma directory not found"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "========================================="
echo "Pre-Deployment Checklist Results"
echo "========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: bash deploy.sh"
    exit 0
else
    echo -e "${RED}✗ $ERRORS issue(s) found. Please fix them before deploying.${NC}"
    exit 1
fi
