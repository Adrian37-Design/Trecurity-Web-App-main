#!/bin/bash
FILE="/var/www/trecurity/.output/server/chunks/_/nitro.mjs"
echo "Patching $FILE with createRequire..."

# We need to inject createRequire at the top if not present, but it's easier to use it inline or just replace the line.
# The line is: import pkg_lru from 'lru-cache'; const LRUCache = pkg_lru.LRUCache || pkg_lru;
# We want: import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { LRUCache } = require('lru-cache');

# Use perl for safe replacement
perl -i -pe "s/import pkg_lru from 'lru-cache'; const LRUCache = pkg_lru.LRUCache \|\| pkg_lru;/import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { LRUCache } = require('lru-cache');/g" "$FILE"

echo "Verifying patch..."
grep "createRequire" "$FILE"
