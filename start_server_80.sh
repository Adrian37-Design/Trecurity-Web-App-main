#!/bin/bash
echo "Switching to Port 80..."

# Stop Nginx to free up port 80
echo "Stopping Nginx..."
systemctl stop nginx
systemctl disable nginx

# Go to server dir
cd /var/www/trecurity/.output/server || exit 1

# Explicitly set Env Vars for Nitro to use Port 80
export NITRO_HOST=0.0.0.0
export NITRO_PORT=80

echo "Cleaning up PM2..."
pm2 stop Trecurity || true
pm2 delete Trecurity || true

echo "Starting Trecurity on Port 80..."
# Start process
pm2 start index.mjs --name "Trecurity" --update-env --node-args="--max-old-space-size=4096"

echo "Saving PM2 list..."
pm2 save

echo "Waiting for startup..."
sleep 5

echo "Checking socket usage:"
ss -tuln | grep :80

echo "Checking logs..."
pm2 logs Trecurity --lines 20 --nostream
