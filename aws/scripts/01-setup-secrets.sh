#!/usr/bin/env bash
# =============================================================================
# 01-setup-secrets.sh
# Store all production secrets in AWS Secrets Manager.
# Run ONCE before deploying ECS tasks.
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
SECRET_NAME="novapay/prod"

# ---------------------------------------------------------------------------
# FILL IN your actual values before running this script.
# ---------------------------------------------------------------------------
DB_HOST="<YOUR_RDS_ENDPOINT>.rds.amazonaws.com"
DB_PASSWORD="uCaqga9QNPG4Rg6xkWYph9TDRL1izoZ9"
REDIS_HOST="<YOUR_ELASTICACHE_ENDPOINT>.cache.amazonaws.com"
REDIS_PASSWORD="1WMELTIyIIuNcKmeYvomqSNA"
JWT_ACCESS_SECRET="05befd660294ac2c52dbd9a0a17858d723ec682b6c59bf96adb0143bb933a74f82900910d862d4eef0dc9f8dfc311502800fa3fe0b6f4ef5f9db7b1f0271b21e"
JWT_REFRESH_SECRET="317422c91dfa98514abb493ad99aec84557268c3e280cc7a5328619990d578f44de65a3cc41a8139a5dbe7367e856e143cfe07b4bd7eb1192a9bc95af4a3a013"
ENCRYPTION_KEY="65ccb8b5b3881d75323999e85e2c80bb15d84a761bb6d22e3cf25907aed8be7b"
HMAC_SECRET="17743dcc709944e4e43f4f11dd9dece78a26766b8205d6dfec70daf48e4946ee"
RESEND_API_KEY=""
CF_API_TOKEN=""
CF_ZONE_ID=""
# ---------------------------------------------------------------------------

SECRET_VALUE=$(cat <<EOF
{
  "DB_HOST":            "$DB_HOST",
  "DB_PASSWORD":        "$DB_PASSWORD",
  "REDIS_HOST":         "$REDIS_HOST",
  "REDIS_PASSWORD":     "$REDIS_PASSWORD",
  "JWT_ACCESS_SECRET":  "$JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET": "$JWT_REFRESH_SECRET",
  "ENCRYPTION_KEY":     "$ENCRYPTION_KEY",
  "HMAC_SECRET":        "$HMAC_SECRET",
  "RESEND_API_KEY":     "$RESEND_API_KEY",
  "CF_API_TOKEN":       "$CF_API_TOKEN",
  "CF_ZONE_ID":         "$CF_ZONE_ID"
}
EOF
)

echo "Creating secret: $SECRET_NAME in $REGION ..."

aws secretsmanager create-secret \
  --name "$SECRET_NAME" \
  --description "NovaPay production environment secrets" \
  --secret-string "$SECRET_VALUE" \
  --region "$REGION" 2>/dev/null \
|| aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "$SECRET_VALUE" \
  --region "$REGION"

echo "✓ Secret stored: $SECRET_NAME"
echo ""
echo "Next: retrieve the secret ARN and update aws/task-definitions/gateway.json"
echo "  aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION --query ARN --output text"
