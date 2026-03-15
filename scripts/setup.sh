#!/bin/bash
# ============================================================================
# UPay Gateway - Quick Setup Script
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       UPay Gateway - Setup Script        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}"; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is required.${NC}"; exit 1; }

# Generate secrets if .env doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Generating .env from template...${NC}"
    cp .env.example .env

    # Generate secure random values
    JWT_ACCESS=$(openssl rand -hex 64)
    JWT_REFRESH=$(openssl rand -hex 64)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | head -c 32)
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '=/+' | head -c 24)
    HMAC_SECRET=$(openssl rand -hex 32)

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_CMD="sed -i ''"
    else
        SED_CMD="sed -i"
    fi

    $SED_CMD "s|CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_64|$JWT_ACCESS|" .env
    $SED_CMD "s|CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_64|$JWT_REFRESH|" .env
    $SED_CMD "s|CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32|$ENCRYPTION_KEY|" .env
    $SED_CMD "s|CHANGE_ME_STRONG_PASSWORD|$DB_PASSWORD|" .env
    $SED_CMD "s|CHANGE_ME_REDIS_PASSWORD|$REDIS_PASSWORD|" .env
    $SED_CMD "s|CHANGE_ME_HMAC_SECRET|$HMAC_SECRET|" .env

    echo -e "${GREEN}✓ Generated .env with secure random secrets${NC}"
else
    echo -e "${YELLOW}Using existing .env file${NC}"
fi

# Create SSL directory
mkdir -p nginx/ssl

echo ""
echo -e "${GREEN}Building and starting services...${NC}"
docker compose up -d --build

echo ""
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
sleep 10

# Check health
if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Gateway API is healthy${NC}"
else
    echo -e "${YELLOW}⏳ Services starting up, check with: docker compose logs gateway${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Setup Complete!                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Dashboard:  http://localhost:3000       ║${NC}"
echo -e "${GREEN}║  API:        http://localhost/api/v1     ║${NC}"
echo -e "${GREEN}║  Health:     http://localhost/health     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Register a merchant: POST /api/v1/auth/register"
echo "  2. Add a UPI ID via dashboard"
echo "  3. Create your first payment session"
echo "  4. Read docs: backend/docs/INTEGRATION.md"
