#!/usr/bin/env bash
# =============================================================================
# 02-create-ecr.sh
# Create ECR repositories for gateway and frontend images.
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Account: $ACCOUNT_ID  Region: $REGION"

for REPO in novapay/gateway novapay/frontend; do
  echo "Creating ECR repository: $REPO ..."
  aws ecr create-repository \
    --repository-name "$REPO" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --region "$REGION" 2>/dev/null && echo "  ✓ Created" || echo "  (already exists)"

  # Keep only the last 5 images to control storage cost
  aws ecr put-lifecycle-policy \
    --repository-name "$REPO" \
    --region "$REGION" \
    --lifecycle-policy-text '{
      "rules": [{
        "rulePriority": 1,
        "description": "Keep last 5 images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 5
        },
        "action": { "type": "expire" }
      }]
    }' > /dev/null
  echo "  ✓ Lifecycle policy set (keep last 5)"
done

echo ""
echo "ECR login:"
echo "  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
