#!/usr/bin/env bash
# =============================================================================
# quick-ec2-deploy.sh
# Run this ON THE NEW EC2 SERVER after SSH-ing in.
# Gets nova-pay.in back online in ~10 minutes.
#
# Usage:
#   ssh ubuntu@<YOUR_EC2_IP>
#   curl -fsSL https://raw.githubusercontent.com/<YOUR_REPO>/main/aws/scripts/quick-ec2-deploy.sh | bash
#   -- OR --
#   Copy this file to the server and run: bash quick-ec2-deploy.sh
# =============================================================================
set -euo pipefail

echo "======================================"
echo " NovaPay — EC2 Quick Deploy"
echo "======================================"

# ---- Install Docker ----
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "  ✓ Docker installed"
else
  echo "[1/5] Docker already installed ✓"
fi

# ---- Install Docker Compose plugin ----
if ! docker compose version &>/dev/null; then
  echo "[2/5] Installing Docker Compose..."
  sudo apt-get install -y docker-compose-plugin 2>/dev/null \
    || sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
         -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  echo "  ✓ Docker Compose installed"
else
  echo "[2/5] Docker Compose already installed ✓"
fi

# ---- Install Git ----
if ! command -v git &>/dev/null; then
  echo "[3/5] Installing Git..."
  sudo apt-get update -qq && sudo apt-get install -y git curl
fi
echo "[3/5] Git ready ✓"

# ---- Clone / pull project ----
PROJECT_DIR="$HOME/upay-gateway"
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "[4/5] Pulling latest code..."
  git -C "$PROJECT_DIR" pull
else
  echo "[4/5] Cloning project..."
  echo ""
  echo "  ⚠ Enter your GitHub repo URL (e.g. https://github.com/YOU/upay-gateway.git):"
  read -r REPO_URL
  git clone "$REPO_URL" "$PROJECT_DIR"
fi
echo "  ✓ Code ready at $PROJECT_DIR"

# ---- Check .env ----
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo ""
  echo "[5/5] ⚠ No .env file found!"
  echo "  Copy your .env file to the server:"
  echo "    scp .env ubuntu@\$(curl -s ifconfig.me):~/upay-gateway/.env"
  echo "  Then re-run this script OR run: cd ~/upay-gateway && docker compose up -d"
  exit 1
fi

# ---- Start the stack ----
echo "[5/5] Starting NovaPay stack..."
cd "$PROJECT_DIR"
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo ""
echo "======================================"
echo " ✓ NovaPay is starting up!"
echo "======================================"
echo ""
echo "Check status:"
echo "  docker compose ps"
echo "  docker compose logs -f gateway"
echo ""
echo "Health check:"
echo "  curl http://localhost:8080/health"
echo ""
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "<SERVER_IP>")
echo "Your server IP: $SERVER_IP"
echo "Point Cloudflare DNS → $SERVER_IP to go live"
