#!/bin/bash
set -e

KEY="${1:-$HOME/Downloads/xenpai-mumbai-key.pem}"
HOST="ubuntu@13.232.171.190"

echo "Deploying to $HOST..."
ssh -i "$KEY" -o StrictHostKeyChecking=no "$HOST" "
  cd ~/upay-gateway
  git pull origin main
  docker compose up -d --build
  echo '--- Deploy done ---'
  docker compose ps
"
