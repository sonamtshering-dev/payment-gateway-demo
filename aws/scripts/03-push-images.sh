#!/usr/bin/env bash
# =============================================================================
# 03-push-images.sh
# Build Docker images and push to ECR.
# Run from the project root: ./aws/scripts/03-push-images.sh
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
GIT_SHA=$(git rev-parse --short HEAD)

echo "Registry : $REGISTRY"
echo "Git SHA  : $GIT_SHA"
echo ""

# ECR login
echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

# ---- Backend (Go gateway) ----
echo ""
echo "Building gateway image..."
docker build \
  --platform linux/amd64 \
  -t "$REGISTRY/novapay/gateway:$GIT_SHA" \
  -t "$REGISTRY/novapay/gateway:latest" \
  ./backend

echo "Pushing gateway image..."
docker push "$REGISTRY/novapay/gateway:$GIT_SHA"
docker push "$REGISTRY/novapay/gateway:latest"
echo "✓ Gateway pushed: $REGISTRY/novapay/gateway:$GIT_SHA"

# ---- Frontend (Next.js) ----
echo ""
echo "Building frontend image..."
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://nova-pay.in \
  -t "$REGISTRY/novapay/frontend:$GIT_SHA" \
  -t "$REGISTRY/novapay/frontend:latest" \
  ./frontend

echo "Pushing frontend image..."
docker push "$REGISTRY/novapay/frontend:$GIT_SHA"
docker push "$REGISTRY/novapay/frontend:latest"
echo "✓ Frontend pushed: $REGISTRY/novapay/frontend:$GIT_SHA"

echo ""
echo "Done. Update ECS services to pick up new images:"
echo "  aws ecs update-service --cluster novapay-prod --service novapay-gateway --force-new-deployment --region $REGION"
echo "  aws ecs update-service --cluster novapay-prod --service novapay-frontend --force-new-deployment --region $REGION"
