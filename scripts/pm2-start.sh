#!/bin/bash
# ============================================
# PM2 Production Start Script for KirimChat
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  KirimChat PM2 Production Deployment  ${NC}"
echo -e "${GREEN}========================================${NC}"

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing globally...${NC}"
    npm install -g pm2
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"

echo -e "\n${YELLOW}[2/5] Installing dependencies...${NC}"
pnpm install --frozen-lockfile

echo -e "\n${YELLOW}[3/5] Building applications...${NC}"
pnpm build

echo -e "\n${YELLOW}[4/5] Creating logs directory...${NC}"
mkdir -p logs

echo -e "\n${YELLOW}[5/5] Starting PM2 applications...${NC}"

# Stop existing processes if running
pm2 delete ecosystem.config.cjs 2>/dev/null || true

# Start with production environment
pm2 start ecosystem.config.cjs --env production

# Save process list for auto-restart on reboot
pm2 save

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!                   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status          - View process status"
echo "  pm2 logs            - View all logs"
echo "  pm2 monit           - Open monitoring dashboard"
echo "  pm2 reload all      - Zero-downtime reload"
echo ""
echo -e "${YELLOW}To enable auto-start on system boot, run:${NC}"
echo "  pm2 startup"
echo "  (then run the command it outputs)"
echo ""
