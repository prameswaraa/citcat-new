#!/bin/bash

# ============================================================
# KirimChat Update Script
# Updates to the latest version from source
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get current version
CURRENT_VERSION="unknown"
if [ -f "$SCRIPT_DIR/VERSION" ]; then
    CURRENT_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat Update Script${NC}${CYAN}                                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Current Version: ${GREEN}${CURRENT_VERSION}${NC}"
echo ""

# Check if installed
if [ ! -f "$SCRIPT_DIR/docker/.env" ]; then
    echo -e "${RED}❌ KirimChat is not installed!${NC}"
    echo "   Please run ./install.sh first."
    exit 1
fi

# Confirm update
echo -e "${YELLOW}⚠️  This will:${NC}"
echo "   1. Create a backup of your database"
echo "   2. Stop all services"
echo "   3. Rebuild Docker images from source"
echo "   4. Restart all services"
echo "   5. Run database migrations"
echo ""

read -p "Do you want to continue? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo ""
    echo "Update cancelled."
    exit 0
fi

echo ""

# Step 1: Backup
echo -e "${YELLOW}[1/5]${NC} ${BOLD}Creating backup...${NC}"
if [ -f "$SCRIPT_DIR/backup.sh" ]; then
    bash "$SCRIPT_DIR/backup.sh" --quiet
    echo -e "  ${GREEN}✓${NC} Backup created"
else
    echo -e "  ${YELLOW}⚠${NC} Backup script not found, skipping..."
fi

echo ""

# Step 2: Stop services
echo -e "${YELLOW}[2/5]${NC} ${BOLD}Stopping services...${NC}"
cd "$SCRIPT_DIR/docker"
docker compose down
echo -e "  ${GREEN}✓${NC} Services stopped"

echo ""

# Step 3: Rebuild images
echo -e "${YELLOW}[3/5]${NC} ${BOLD}Rebuilding images...${NC}"
echo "   This may take a few minutes..."
echo ""

docker compose build --no-cache 2>&1 | while read line; do echo "  $line"; done

echo ""
echo -e "  ${GREEN}✓${NC} Images rebuilt"

echo ""

# Step 4: Start services
echo -e "${YELLOW}[4/5]${NC} ${BOLD}Starting services...${NC}"
docker compose up -d
echo -e "  ${GREEN}✓${NC} Services started"

echo ""

# Step 5: Wait and verify
echo -e "${YELLOW}[5/5]${NC} ${BOLD}Verifying update...${NC}"
echo ""

# Wait for services
echo -n "  Waiting for services to be healthy"
for i in {1..30}; do
    echo -n "."
    sleep 2
done
echo ""

# Check health
if curl -sf "http://localhost:3005/health" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend API is healthy"
else
    echo -e "  ${YELLOW}⚠${NC} Backend may still be starting..."
fi

if curl -sf "http://localhost:3000" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Frontend is healthy"
else
    echo -e "  ${YELLOW}⚠${NC} Frontend may still be starting..."
fi

echo ""

# Show status
docker compose ps

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Update completed!${NC}${GREEN}                                      ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Version: ${CURRENT_VERSION}${NC}${GREEN}                                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  📋 View changelog: cat CHANGELOG.md"
echo ""
echo "  If you experience issues, check logs:"
echo "  cd docker && docker compose logs -f"
echo ""
