#!/bin/bash
FILE="/var/www/trecurity/.output/server/chunks/_/nitro.mjs"
echo "Patching $FILE..."
perl -i -pe "s/import \{ LRUCache \} from 'lru-cache'/import pkg_lru from 'lru-cache'; const LRUCache = pkg_lru.LRUCache || pkg_lru/g" "$FILE"
echo "Rebuilding argon2..."
cd /var/www/trecurity/.output/server
npm install argon2 --build-from-source
echo "Fix complete."
