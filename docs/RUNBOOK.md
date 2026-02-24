# MAdef -- Operations Runbook

This runbook contains step-by-step operational procedures for the MAdef Home Care Management Platform. Each procedure includes exact commands and success criteria.

---

## Table of Contents

1. [Deploy New Version](#1-deploy-new-version)
2. [Rollback](#2-rollback)
3. [Restore Database Backup](#3-restore-database-backup)
4. [Reconnect WhatsApp](#4-reconnect-whatsapp)
5. [Verify System Health](#5-verify-system-health)
6. [Scale Horizontally (Future)](#6-scale-horizontally-future)
7. [Respond to Incidents](#7-respond-to-incidents)

---

## 1. Deploy New Version

### Prerequisites
- SSH access to production server
- Docker Compose installed
- Access to the Git repository

### Procedure

1. SSH into the production server:
   ```bash
   ssh deploy@production-server
   cd /opt/madef
   ```

2. Pull the latest code:
   ```bash
   git fetch origin main
   git log --oneline HEAD..origin/main  # Review incoming changes
   git pull origin main
   ```

3. Check for new environment variables:
   ```bash
   diff .env .env.example
   # Add any new variables to .env
   ```

4. Build and deploy with zero-downtime restart:
   ```bash
   docker compose build app
   docker compose up -d app
   ```

5. Run database migrations (if any):
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

6. Verify the deployment:
   ```bash
   # Wait for container to be healthy
   sleep 10

   # Check health endpoint
   curl -s http://localhost:3000/api/health | jq '.status'

   # Check container logs for errors
   docker compose logs --tail=50 app
   ```

7. Verify application version:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.version'
   ```

### Success Criteria
- `/api/health` returns `{"status": "healthy"}` with HTTP 200
- No errors in container logs
- All subsystem checks (database, redis, whatsapp) show `ok` or `not_configured`
- Application version matches the expected release

---

## 2. Rollback

### When to Rollback
- Health check returns `unhealthy` (HTTP 503) after deploy
- Critical errors in application logs
- Database migration failure (see step 2b)

### Procedure

1. Identify the previous working commit:
   ```bash
   cd /opt/madef
   git log --oneline -5
   # Note the commit hash of the last known good version
   ```

2. Roll back the application code:
   ```bash
   git checkout <previous-commit-hash>
   ```

2b. If a database migration was applied and needs reversal:
   ```bash
   # List applied migrations
   docker compose exec app npx prisma migrate status

   # Restore from backup (see Section 3) if migration is not reversible
   # Prisma does not support automatic down-migrations
   ```

3. Rebuild and restart:
   ```bash
   docker compose build app
   docker compose up -d app
   ```

4. Verify rollback:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.status'
   docker compose logs --tail=30 app
   ```

5. Notify the team:
   ```
   Subject: [MAdef] Production rollback to <commit-hash>
   Reason: <brief description of the issue>
   ```

### Success Criteria
- `/api/health` returns `{"status": "healthy"}` with HTTP 200
- Application functions correctly with the previous version
- No data loss (confirmed via database checks)

---

## 3. Restore Database Backup

### Backup Location
Backups are stored in `./backups/` on the host, created by the `backup` container. Files are named `madef_YYYYMMDD_HHMMSS.sql.gz`. Backups older than 7 days are automatically pruned.

### Procedure

1. List available backups:
   ```bash
   ls -lht /opt/madef/backups/madef_*.sql.gz
   ```

2. Stop the application to prevent writes during restore:
   ```bash
   docker compose stop app
   ```

3. Restore the chosen backup:
   ```bash
   # Decompress and restore
   gunzip -c /opt/madef/backups/madef_20260224_020000.sql.gz | \
     docker compose exec -T postgres psql -U madef -d madef
   ```

   If you need to drop and recreate the database first:
   ```bash
   docker compose exec postgres psql -U madef -d postgres -c "DROP DATABASE madef;"
   docker compose exec postgres psql -U madef -d postgres -c "CREATE DATABASE madef OWNER madef;"
   gunzip -c /opt/madef/backups/madef_20260224_020000.sql.gz | \
     docker compose exec -T postgres psql -U madef -d madef
   ```

4. Restart the application:
   ```bash
   docker compose start app
   ```

5. Verify data integrity:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.database'
   # Should show: {"status": "ok", "latency": <number>}

   # Verify row counts for key tables
   docker compose exec postgres psql -U madef -d madef -c "
     SELECT 'pacientes' AS tbl, COUNT(*) FROM \"Paciente\"
     UNION ALL SELECT 'cuidadores', COUNT(*) FROM \"Cuidador\"
     UNION ALL SELECT 'avaliacoes', COUNT(*) FROM \"Avaliacao\";
   "
   ```

### Success Criteria
- Database connection succeeds (health check `database.status: "ok"`)
- Row counts match expected values from the backup timestamp
- Application serves requests without database errors

---

## 4. Reconnect WhatsApp

### When WhatsApp Disconnects
- QR code session expired
- Network interruption between app and bridge
- Bridge process crashed
- Phone disconnected from WhatsApp Web

### Procedure

1. Check current WhatsApp status:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.whatsapp'
   ```

2. Check the WhatsApp bridge logs:
   ```bash
   # If running via Docker
   docker compose logs --tail=100 app | grep -i whatsapp

   # If running standalone
   cat /opt/madef/.wa-session.json | jq '.'
   ```

3. Run the diagnostic script:
   ```bash
   docker compose exec app npx tsx scripts/diagnose-whatsapp.ts
   ```

4. If the bridge process is down, restart it:
   ```bash
   # Docker environment
   docker compose restart app

   # Standalone bridge
   node whatsapp-bridge/server.js &
   ```

5. If a new QR code scan is required:
   ```bash
   # Connect via the admin API
   curl -X POST http://localhost:3000/api/whatsapp/connect \
     -H "Cookie: <admin-session-cookie>"

   # Or use the admin UI: navigate to /admin/whatsapp
   # Scan the QR code with your WhatsApp mobile app
   ```

6. If the session file is corrupted, reset authentication:
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/reset-auth \
     -H "Cookie: <admin-session-cookie>"

   # Then reconnect (step 5)
   ```

7. Verify reconnection:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.whatsapp'
   # Expected: {"status": "ok", "connected": true}
   ```

### Success Criteria
- Health check shows `whatsapp.status: "ok"` and `whatsapp.connected: true`
- Test message sends successfully
- Incoming messages are received and processed

---

## 5. Verify System Health

### Routine Health Check

1. Query the health endpoint:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.'
   ```

2. Check each subsystem:
   ```bash
   # Database
   curl -s http://localhost:3000/api/health | jq '.checks.database'
   # Expected: {"status": "ok", "latency": <low-number>}

   # Redis
   curl -s http://localhost:3000/api/health | jq '.checks.redis'
   # Expected: {"status": "ok", "latencyMs": <low-number>} or {"status": "not_configured"}

   # WhatsApp
   curl -s http://localhost:3000/api/health | jq '.checks.whatsapp'
   # Expected: {"status": "ok", "connected": true, ...}

   # Memory
   curl -s http://localhost:3000/api/health | jq '.checks.memory'
   # Expected: percentage below 85
   ```

3. Check application metrics:
   ```bash
   curl -s http://localhost:3000/api/metrics | jq '.'
   ```

4. Check system status (admin):
   ```bash
   curl -s http://localhost:3000/api/admin/system/status \
     -H "Cookie: <admin-session-cookie>" | jq '.'
   ```

5. Check container resource usage:
   ```bash
   docker compose stats --no-stream
   ```

6. Check disk space for backups:
   ```bash
   df -h /opt/madef/backups
   du -sh /opt/madef/backups/*
   ```

7. Check database schema consistency:
   ```bash
   curl -s http://localhost:3000/api/health | jq '{dbSchemaOk, missingColumns}'
   # Expected: {"dbSchemaOk": true, "missingColumns": []}
   ```

### Success Criteria
- Overall status is `healthy` (HTTP 200)
- Database latency is under 50ms
- Memory usage is below 85%
- No missing database columns
- Backup directory has recent backups (within last 24 hours)
- No container restarts (check with `docker compose ps`)

---

## 6. Scale Horizontally (Future)

### Current Architecture
MAdef currently runs as a single Next.js instance. Horizontal scaling requires addressing these constraints:

- **Session affinity**: NextAuth sessions must be shared (use Redis session store)
- **WhatsApp bridge**: Only one bridge instance can be connected to a single phone number
- **Database**: PostgreSQL supports multiple connections; configure pool size per instance
- **BullMQ**: Workers can scale horizontally (Redis-backed queue handles coordination)

### Planned Scaling Approach

1. Deploy a load balancer (nginx or cloud LB):
   ```nginx
   upstream madef {
       server app1:3000;
       server app2:3000;
   }
   ```

2. Move session storage to Redis:
   ```bash
   # Ensure REDIS_URL is set for all instances
   REDIS_URL=redis://redis:6379
   ```

3. Scale application instances:
   ```bash
   docker compose up -d --scale app=2
   ```

4. Keep WhatsApp bridge as a singleton:
   ```bash
   # Only one instance should run the bridge
   # Use WA_STANDALONE=true on one designated instance
   ```

5. Monitor connection pool usage:
   ```bash
   docker compose exec postgres psql -U madef -d madef -c "
     SELECT count(*) FROM pg_stat_activity WHERE datname = 'madef';
   "
   ```

### Success Criteria
- All instances return healthy status
- Load balancer distributes traffic evenly
- WhatsApp bridge runs on exactly one instance
- No database connection pool exhaustion

---

## 7. Respond to Incidents

### 7.1 Circuit Breaker Open (WhatsApp)

**Symptom**: WhatsApp messages are not being sent. Health check shows `whatsapp.status: "disconnected"` or outbox messages are piling up.

**Root Cause**: The circuit breaker opens after 5 consecutive failures (configurable via `WA_CIRCUIT_FAILURE_THRESHOLD`). It remains open for 30 seconds (`WA_CIRCUIT_OPEN_MS`).

**Response**:

1. Check the circuit breaker state:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.whatsapp'
   ```

2. Check WhatsApp bridge connectivity:
   ```bash
   curl -s http://localhost:3001/status | jq '.'
   ```

3. If the bridge is down, restart it:
   ```bash
   docker compose restart app
   ```

4. If the bridge is up but WhatsApp is disconnected:
   ```bash
   # Follow Section 4 (Reconnect WhatsApp)
   ```

5. The circuit breaker will auto-close after the open duration expires and a successful request passes through. Monitor:
   ```bash
   # Watch for recovery
   watch -n 5 'curl -s http://localhost:3000/api/health | jq ".checks.whatsapp.status"'
   ```

6. Check for queued messages that need retry:
   ```bash
   curl -s http://localhost:3000/api/whatsapp/queue \
     -H "Cookie: <admin-session-cookie>" | jq '.data | length'
   ```

**Resolution Criteria**: Circuit breaker closes, queued messages drain, new messages send successfully.

### 7.2 High Error Rate

**Symptom**: Metrics show elevated error counts. Users report failures. Logs show repeated errors.

**Response**:

1. Check application metrics:
   ```bash
   curl -s http://localhost:3000/api/metrics | jq '.'
   ```

2. Check recent logs for errors:
   ```bash
   docker compose logs --tail=200 app | grep -i '"level":50' | tail -20
   # Level 50 = ERROR in Pino
   ```

3. Check system resources:
   ```bash
   docker compose stats --no-stream
   ```

4. Check database health:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.database'

   # Check for long-running queries
   docker compose exec postgres psql -U madef -d madef -c "
     SELECT pid, now() - pg_stat_activity.query_start AS duration, query
     FROM pg_stat_activity
     WHERE state != 'idle'
     AND (now() - pg_stat_activity.query_start) > interval '30 seconds'
     ORDER BY duration DESC;
   "
   ```

5. Check Redis health:
   ```bash
   docker compose exec redis redis-cli info stats | grep -E "total_commands|rejected"
   ```

6. If a specific endpoint is failing, check rate limiting:
   ```bash
   # Rate limit is per-endpoint; check if legitimate traffic is being blocked
   docker compose logs --tail=100 app | grep -i "rate.limit"
   ```

7. If resource exhaustion is the issue:
   ```bash
   # Restart the application
   docker compose restart app

   # If PostgreSQL connections are exhausted
   docker compose restart postgres
   # Wait for health check, then restart app
   sleep 10 && docker compose restart app
   ```

8. If the issue persists, consider a rollback (see Section 2).

**Resolution Criteria**: Error rate returns to baseline, health check is `healthy`, no user-facing errors.

### 7.3 Database Unreachable

**Symptom**: Health check returns `unhealthy` with `database.status: "error"`. Application returns 500 errors.

**Response**:

1. Check PostgreSQL container:
   ```bash
   docker compose ps postgres
   docker compose logs --tail=50 postgres
   ```

2. Check if PostgreSQL is accepting connections:
   ```bash
   docker compose exec postgres pg_isready -U madef
   ```

3. Check disk space (PostgreSQL may stop if disk is full):
   ```bash
   df -h
   docker compose exec postgres du -sh /var/lib/postgresql/data
   ```

4. Restart PostgreSQL if needed:
   ```bash
   docker compose restart postgres
   sleep 10
   docker compose exec postgres pg_isready -U madef
   ```

5. Restart the application after database recovery:
   ```bash
   docker compose restart app
   curl -s http://localhost:3000/api/health | jq '.checks.database'
   ```

**Resolution Criteria**: `pg_isready` returns success, health check shows `database.status: "ok"`, application serves requests normally.

### 7.4 Memory Usage High

**Symptom**: Health check shows `memory.percentage` above 85%. Application becomes slow or unresponsive.

**Response**:

1. Check current memory usage:
   ```bash
   curl -s http://localhost:3000/api/health | jq '.checks.memory'
   docker compose stats --no-stream app
   ```

2. Check for memory leaks in logs:
   ```bash
   docker compose logs --tail=100 app | grep -i "heap\|memory\|oom"
   ```

3. Restart the application to reclaim memory:
   ```bash
   docker compose restart app
   ```

4. If memory usage climbs again quickly, investigate:
   ```bash
   # Check Node.js heap with increased limit
   # Add to docker-compose.yml environment:
   #   NODE_OPTIONS=--max-old-space-size=2048
   docker compose up -d app
   ```

**Resolution Criteria**: Memory usage drops below 70% after restart and remains stable under normal load.
