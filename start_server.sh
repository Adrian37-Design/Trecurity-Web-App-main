#!/bin/bash
echo "Starting Application Recovery..."
cd /var/www/trecurity/.output/server || exit 1

# Explicitly set Env Vars for Nitro
export NITRO_HOST=0.0.0.0
export NITRO_PORT=3000
# Ensure Database URL is set (from previous context, usually injected by PM2 or env file, taking no chances)
# export DATABASE_URL="..." # Assuming this is already in PM2 env, but let's rely on --update-env logic first.

echo "Stopping existing process..."
pm2 stop Trecurity || true
pm2 delete Trecurity || true

echo "Starting process with HOST=$NITRO_HOST PORT=$NITRO_PORT..."
# Start with explicit env vars injected into the process
pm2 start index.mjs --name "Trecurity" --update-env --node-args="--max-old-space-size=4096"

echo "Saving PM2 list..."
pm2 save

echo "Waiting for startup..."
sleep 5

echo "Checking logs..."
pm2 logs Trecurity --lines 20 --nostream
pm2 env 0
