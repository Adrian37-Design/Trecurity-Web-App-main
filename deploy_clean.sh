#!/bin/bash
# Trecurity Clean Deployment Script
# Use this for schema changes that require database migrations

set -e  # Exit on any error

echo "🚀 Starting clean deployment..."

# Configuration - set these via environment variables before running
SERVER="${DEPLOY_SERVER:?'DEPLOY_SERVER must be set (e.g. export DEPLOY_SERVER=root@your-server-ip)'}"
APP_DIR="${APP_DIR:-/var/www/trecurity}"
PASSWORD="${DEPLOY_PASSWORD:?'DEPLOY_PASSWORD must be set'}"

# Step 1: Upload schema file
echo "📤 Step 1/7: Uploading schema..."
scp prisma/schema.prisma $SERVER:$APP_DIR/prisma/schema.prisma

# Step 2: Run database migration
echo "🗄️  Step 2/7: Running database migration..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $APP_DIR && npx prisma migrate deploy"

# Step 3: Delete Prisma cache
echo "🧹 Step 3/7: Clearing Prisma cache..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $APP_DIR && rm -rf node_modules/.prisma"

# Step 4: Regenerate Prisma client
echo "🔄 Step 4/7: Regenerating Prisma client..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $APP_DIR && npx prisma generate"

# Step 5: Upload application files
echo "📤 Step 5/7: Uploading application files..."
scp -r server/api/* $SERVER:$APP_DIR/server/api/
scp -r components/* $SERVER:$APP_DIR/components/
scp -r utils/* $SERVER:$APP_DIR/utils/

# Step 6: Clean build
echo "🏗️  Step 6/7: Building application..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $APP_DIR && rm -rf .output && npm run build"

# Step 7: Restart PM2
echo "🔄 Step 7/7: Restarting application..."
sshpass -p "$PASSWORD" ssh $SERVER "pm2 restart Trecurity"

echo "✅ Deployment complete!"
echo "🌐 Check: http://${DEPLOY_SERVER#*@}"
