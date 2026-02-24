#!/bin/sh
# PostgreSQL backup script — runs via cron inside the backup container
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/madef_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
pg_dump -h "${PGHOST:-postgres}" -U "${PGUSER:-madef}" "${PGDATABASE:-madef}" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "madef_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
