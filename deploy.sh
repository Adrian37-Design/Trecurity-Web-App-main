#!/bin/bash

##############################################################################
# Trecurity Deployment Script for Contabo Server
# This script handles the complete deployment process
##############################################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Trecurity Deployment Script"
echo "========================================="
echo ""

# Function to print step
print_step() {
    echo ""
    echo -e "${BLUE}==>${NC} $1"
    echo "-----------------------------------"
}

# Function to check if command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 failed"
        exit 1
    fi
}

# Get the directory where script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_step "Step 1: Checking prerequisites"
if [ -f "pre-deploy-checklist.sh" ]; then
    bash pre-deploy-checklist.sh
    check_success "Pre-deployment checks"
else
    echo -e "${YELLOW}⚠${NC} Pre-deployment checklist script not found, proceeding anyway..."
fi

print_step "Step 2: Installing dependencies"
echo "Running npm ci for production build..."
npm ci --production=false
check_success "Dependencies installed"

print_step "Step 3: Generating Prisma Client"
echo "Generating Prisma client..."
npx prisma generate
check_success "Prisma client generated"


# Load environment variables relative to the script location
if [ -f "$SCRIPT_DIR/pre-deploy-checklist.sh" ]; then
    set -a
    source <(grep -v '^#' "$SCRIPT_DIR/.env.production" | sed 's/^export //')
    set +a
elif [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

print_step "Step 4: Running Database Migrations"
echo "Applying database migrations..."

# Check if database exists, create if not
# Set DB credentials via environment or extract from DATABASE_URL
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:?'DB_PASS must be set (e.g. export DB_PASS=yourpassword)'}"
DB_NAME="${DB_NAME:-trecurity}"

mysql -u"$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true

# Run migrations
npx prisma migrate deploy
check_success "Database migrations applied"

print_step "Step 5: Building Application"
echo "Building Nuxt application for production..."
NODE_ENV=production npm run build
check_success "Application built successfully"

# Verify build output
if [ ! -d ".output" ]; then
    echo -e "${RED}✗${NC} Build output directory not found"
    exit 1
fi

if [ ! -f ".output/server/index.mjs" ]; then
    echo -e "${RED}✗${NC} Server entry file not found"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build artifacts verified"

print_step "Step 6: Stopping Existing Application"
if pm2 list | grep -q "Trecurity"; then
    echo "Stopping existing Trecurity process..."
    pm2 stop Trecurity || true
    pm2 delete Trecurity || true
    echo -e "${GREEN}✓${NC} Existing process stopped"
else
    echo -e "${YELLOW}⚠${NC} No existing process found"
fi

print_step "Step 7: Starting Application with PM2"
echo "Starting Trecurity with PM2..."

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Start with PM2
pm2 start ecosystem.config.cjs
check_success "Application started with PM2"

# Save PM2 process list
pm2 save
check_success "PM2 configuration saved"

# Setup PM2 to start on boot (only if not already set up)
if ! pm2 startup | grep -q "already"; then
    echo "Setting up PM2 to start on system boot..."
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
fi

print_step "Step 8: Verifying Deployment"
echo "Waiting for application to start..."
sleep 5

# Check PM2 status
pm2 list

# Check if process is running
if pm2 list | grep -q "Trecurity.*online"; then
    echo -e "${GREEN}✓${NC} Application is running"
else
    echo -e "${RED}✗${NC} Application failed to start"
    echo "Showing logs:"
    pm2 logs Trecurity --nostream --lines 50
    exit 1
fi

# Test local connectivity
echo ""
echo "Testing local connectivity..."
sleep 3

if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓${NC} Application is responding on port 3000"
else
    echo -e "${YELLOW}⚠${NC} Could not verify HTTP response (this may be normal if authentication is required)"
fi

print_step "Deployment Complete!"
echo ""
echo -e "${GREEN}✓${NC} Trecurity has been successfully deployed!"
echo ""
echo "Useful commands:"
echo "  View logs:        pm2 logs Trecurity"
echo "  Check status:     pm2 status"
echo "  Restart:          pm2 restart Trecurity"
echo "  Stop:             pm2 stop Trecurity"
echo "  Monitor:          pm2 monit"
echo ""
echo "Application is running on: http://localhost:3000"
echo "Public URL: https://trecurity.com"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure your firewall allows traffic on port 3000"
echo -e "${YELLOW}Note:${NC} For HTTPS, ensure you have configured Nginx/Apache reverse proxy with SSL"
echo ""
echo "Showing recent logs:"
echo "-----------------------------------"
pm2 logs Trecurity --nostream --lines 20
