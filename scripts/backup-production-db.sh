#!/bin/bash

# Production Database Backup Script
# Run this on your Contabo server BEFORE deploying

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/backups"
BACKUP_FILE="$BACKUP_DIR/trecurity_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "Creating database backup..."
echo "Backup file: $BACKUP_FILE"

# Replace with your actual database credentials
# These should match your .env DATABASE_URL
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="trecurity"
DB_USER="postgres"

# Create backup (will prompt for password)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f $BACKUP_FILE $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    ls -lh $BACKUP_FILE
    
    # Optionally compress the backup
    gzip $BACKUP_FILE
    echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "To restore this backup later, use:"
echo "pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ${BACKUP_FILE}.gz"
