#!/usr/bin/env bash
# =============================================================================
# 06-setup-autoscaling.sh
# Configure Application Auto Scaling for ECS services.
# Gateway: 1-5 tasks, scale on CPU > 70%
# Frontend: 1-3 tasks, scale on CPU > 70%
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
CLUSTER="novapay-prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

register_scaling() {
  local SERVICE=$1 MIN=$2 MAX=$3
  local RESOURCE="service/$CLUSTER/$SERVICE"

  echo "Registering scalable target: $SERVICE ($MIN → $MAX) ..."
  aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id "$RESOURCE" \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity "$MIN" \
    --max-capacity "$MAX" \
    --region "$REGION"

  echo "  Setting CPU scale-out policy (>70%) ..."
  aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --resource-id "$RESOURCE" \
    --scalable-dimension ecs:service:DesiredCount \
    --policy-name "${SERVICE}-cpu-scale-out" \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
      "TargetValue": 70.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
      },
      "ScaleInCooldown": 300,
      "ScaleOutCooldown": 60
    }' \
    --region "$REGION" > /dev/null

  echo "  ✓ $SERVICE: auto-scaling configured"
}

register_scaling "novapay-gateway"  1 5
register_scaling "novapay-frontend" 1 3

echo ""
echo "✓ Auto-scaling configured."
echo ""
echo "View current task counts:"
echo "  aws ecs describe-services --cluster $CLUSTER --services novapay-gateway novapay-frontend --region $REGION --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount}'"
