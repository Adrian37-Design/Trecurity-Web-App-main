#!/bin/bash
# Set PG credentials via environment variables before running:
# export PGPASSWORD=your_password
# export PG_HOST=your-rds-endpoint
# export PG_USER=your_user
# export PG_DB=your_database
export PGPASSWORD="${PGPASSWORD:?'PGPASSWORD must be set'}"
PG_HOST="${PG_HOST:?'PG_HOST must be set'}"
PG_USER="${PG_USER:?'PG_USER must be set'}"
PG_DB="${PG_DB:?'PG_DB must be set'}"
psql -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -p 5432 -c "UPDATE \"Vehicle\" SET \"name\" = 'EXCAVATOR' WHERE \"name\" LIKE '%ESCAVATOR%';"
