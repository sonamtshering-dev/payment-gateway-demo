#!/usr/bin/env bash
# =============================================================================
# 04-migrate-db.sh
# Migrate PostgreSQL data from the current server to RDS.
#
# Steps:
#   1. Dump from current server (run on old server or locally with SSH tunnel)
#   2. Restore to RDS
#   3. Verify row counts
#
# Prerequisites:
#   - pg_dump and pg_restore installed locally
#   - RDS instance is running and accessible
#   - Your IP is in the RDS security group (or use an SSH tunnel)
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# FILL IN before running
# ---------------------------------------------------------------------------
OLD_SERVER_HOST="<YOUR_CURRENT_SERVER_IP>"
OLD_SERVER_SSH_USER="ubuntu"        # or root / ec2-user etc.

RDS_ENDPOINT="<YOUR_RDS_ENDPOINT>.rds.amazonaws.com"
RDS_USER="upay"
RDS_DB="upay_gateway"

DUMP_FILE="novapay_backup_$(date +%Y%m%d_%H%M%S).dump"
# ---------------------------------------------------------------------------

echo "=== NovaPay DB Migration: old server → RDS ==="
echo ""

# ---- Step 1: Dump from old server ----
echo "[1/3] Dumping database from $OLD_SERVER_HOST ..."
ssh "$OLD_SERVER_SSH_USER@$OLD_SERVER_HOST" \
  "docker exec \$(docker ps -qf name=postgres) pg_dump -Fc -U upay upay_gateway" \
  > "$DUMP_FILE"

DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
echo "  ✓ Dump saved: $DUMP_FILE ($DUMP_SIZE)"

# ---- Step 2: Restore to RDS ----
echo ""
echo "[2/3] Restoring to RDS ($RDS_ENDPOINT) ..."
echo "  (You will be prompted for the RDS password)"
pg_restore \
  --host="$RDS_ENDPOINT" \
  --port=5432 \
  --username="$RDS_USER" \
  --dbname="$RDS_DB" \
  --verbose \
  --no-privileges \
  --no-owner \
  "$DUMP_FILE"
echo "  ✓ Restore complete"

# ---- Step 3: Verify row counts ----
echo ""
echo "[3/3] Verifying row counts on RDS ..."
psql \
  "host=$RDS_ENDPOINT port=5432 user=$RDS_USER dbname=$RDS_DB sslmode=require" \
  -c "
    SELECT 'merchants'    AS tbl, COUNT(*) FROM merchants
    UNION ALL
    SELECT 'payments',            COUNT(*) FROM payments
    UNION ALL
    SELECT 'transactions',        COUNT(*) FROM transactions
    UNION ALL
    SELECT 'api_keys',            COUNT(*) FROM api_keys
    ORDER BY tbl;
  "

echo ""
echo "✓ Migration complete. Dump file kept at: ./$DUMP_FILE"
echo ""
echo "Next steps:"
echo "  1. Update aws/scripts/01-setup-secrets.sh with the RDS endpoint"
echo "  2. Run 05-deploy-ecs.sh to deploy services"
echo "  3. Test /health on the ALB before switching DNS"
