#!/bin/bash
echo "Configuring for Cloudflare Origin Rule (Port 3000)..."

# Stop Nginx just in case, though it doesn't conflict on 3000.
# It minimizes confusion.
systemctl stop nginx

cd /var/www/trecurity/.output/server || exit 1

# Explicitly set Env Vars for Nitro to use Public Port 3000
export NITRO_HOST=0.0.0.0
export NITRO_PORT=3000

echo "Cleaning up PM2..."
pm2 stop Trecurity || true
pm2 delete Trecurity || true

echo "Starting Trecurity on 0.0.0.0:3000..."
pm2 start index.mjs --name "Trecurity" --update-env --node-args="--max-old-space-size=4096"

echo "Saving PM2 list..."
pm2 save

echo "Waiting for startup..."
sleep 5

echo "Checking socket usage:"
ss -tuln | grep :3000

echo "Checking logs..."
pm2 logs Trecurity --lines 20 --nostream
