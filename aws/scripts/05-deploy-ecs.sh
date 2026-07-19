#!/usr/bin/env bash
# =============================================================================
# 05-deploy-ecs.sh
# Register ECS task definitions and create/update ECS services.
# Run after: secrets stored, images pushed, RDS + ElastiCache running.
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
CLUSTER="novapay-prod"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ---------------------------------------------------------------------------
# FILL IN after creating ALB target groups
# ---------------------------------------------------------------------------
GATEWAY_TG_ARN="arn:aws:elasticloadbalancing:ap-south-1:$ACCOUNT_ID:targetgroup/novapay-gateway-tg/XXXX"
FRONTEND_TG_ARN="arn:aws:elasticloadbalancing:ap-south-1:$ACCOUNT_ID:targetgroup/novapay-frontend-tg/XXXX"
PRIVATE_SUBNET_1="subnet-XXXXXXXX"
PRIVATE_SUBNET_2="subnet-XXXXXXXX"
ECS_SECURITY_GROUP="sg-XXXXXXXX"
# ---------------------------------------------------------------------------

# Substitute ACCOUNT_ID in task definition files
GATEWAY_TD=$(sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" aws/task-definitions/gateway.json)
FRONTEND_TD=$(sed "s/ACCOUNT_ID/$ACCOUNT_ID/g" aws/task-definitions/frontend.json)

# ---- Register task definitions ----
echo "Registering task definitions..."
GATEWAY_TD_ARN=$(echo "$GATEWAY_TD" | aws ecs register-task-definition \
  --cli-input-json file:///dev/stdin \
  --region "$REGION" \
  --query "taskDefinition.taskDefinitionArn" --output text)
echo "  ✓ Gateway TD: $GATEWAY_TD_ARN"

FRONTEND_TD_ARN=$(echo "$FRONTEND_TD" | aws ecs register-task-definition \
  --cli-input-json file:///dev/stdin \
  --region "$REGION" \
  --query "taskDefinition.taskDefinitionArn" --output text)
echo "  ✓ Frontend TD: $FRONTEND_TD_ARN"

# ---- Create ECS cluster if it doesn't exist ----
echo ""
echo "Creating ECS cluster: $CLUSTER ..."
aws ecs create-cluster \
  --cluster-name "$CLUSTER" \
  --capacity-providers FARGATE FARGATE_SPOT \
  --region "$REGION" 2>/dev/null && echo "  ✓ Cluster created" || echo "  (already exists)"

# ---- Create or update gateway service ----
echo ""
echo "Deploying gateway service..."
aws ecs create-service \
  --cluster "$CLUSTER" \
  --service-name "novapay-gateway" \
  --task-definition "$GATEWAY_TD_ARN" \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$GATEWAY_TG_ARN,containerName=gateway,containerPort=8080" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --region "$REGION" 2>/dev/null \
|| aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "novapay-gateway" \
  --task-definition "$GATEWAY_TD_ARN" \
  --desired-count 1 \
  --force-new-deployment \
  --region "$REGION" > /dev/null
echo "  ✓ Gateway service deployed"

# ---- Create or update frontend service ----
echo ""
echo "Deploying frontend service..."
aws ecs create-service \
  --cluster "$CLUSTER" \
  --service-name "novapay-frontend" \
  --task-definition "$FRONTEND_TD_ARN" \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=3000" \
  --health-check-grace-period-seconds 90 \
  --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
  --region "$REGION" 2>/dev/null \
|| aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "novapay-frontend" \
  --task-definition "$FRONTEND_TD_ARN" \
  --desired-count 1 \
  --force-new-deployment \
  --region "$REGION" > /dev/null
echo "  ✓ Frontend service deployed"

echo ""
echo "Waiting for services to stabilize (this takes ~2 min)..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services novapay-gateway novapay-frontend \
  --region "$REGION"

echo ""
echo "✓ Deployment complete."
echo ""
echo "Check health:"
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region "$REGION" \
  --query "LoadBalancers[?contains(LoadBalancerName,'novapay')].DNSName" \
  --output text 2>/dev/null || echo "<ALB_DNS>")
echo "  curl http://$ALB_DNS/health"
