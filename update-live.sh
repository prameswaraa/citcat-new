#!/bin/bash

# ============================================================================
# KirimChat - Zero Downtime Update Script
# Update frontend and backend without stopping the website
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"

# Get current version
CURRENT_VERSION="unknown"
if [ -f "$SCRIPT_DIR/VERSION" ]; then
    CURRENT_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat Zero Downtime Update${NC}${CYAN}                          ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Version: ${GREEN}${CURRENT_VERSION}${NC}"
echo ""

# Check if docker is running
if ! docker ps &>/dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ docker-compose.yml not found!${NC}"
    exit 1
fi

# Check what to update
UPDATE_FRONTEND=true
UPDATE_BACKEND=true

if [ "$1" == "frontend" ]; then
    UPDATE_BACKEND=false
    echo -e "${YELLOW}Updating frontend only${NC}"
elif [ "$1" == "backend" ]; then
    UPDATE_FRONTEND=false
    echo -e "${YELLOW}Updating backend only${NC}"
else
    echo -e "${YELLOW}Updating frontend and backend${NC}"
fi

echo ""

# Update Frontend
if [ "$UPDATE_FRONTEND" = true ]; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}[1/2] Updating Frontend${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "  ${YELLOW}Building new frontend image...${NC}"
    docker compose -f "$COMPOSE_FILE" build --no-cache frontend
    echo -e "  ${GREEN}✓${NC} Frontend image built"
    
    echo ""
    echo -e "  ${YELLOW}Swapping to new frontend container...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps frontend
    echo -e "  ${GREEN}✓${NC} Frontend updated"
    
    # Wait for health check
    echo ""
    echo -n "  Waiting for frontend to be healthy"
    for i in {1..15}; do
        echo -n "."
        sleep 2
        if docker exec kirimchat-frontend wget -q --spider http://localhost:3000 2>/dev/null; then
            break
        fi
    done
    echo ""
    
    if docker exec kirimchat-frontend wget -q --spider http://localhost:3000 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Frontend is healthy"
    else
        echo -e "  ${YELLOW}⚠${NC} Frontend may still be starting..."
    fi
    
    echo ""
fi

# Update Backend
if [ "$UPDATE_BACKEND" = true ]; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}[2/2] Updating Backend${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "  ${YELLOW}Building new backend image...${NC}"
    docker compose -f "$COMPOSE_FILE" build --no-cache backend
    echo -e "  ${GREEN}✓${NC} Backend image built"
    
    echo ""
    echo -e "  ${YELLOW}Swapping to new backend container...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps backend
    echo -e "  ${GREEN}✓${NC} Backend updated"
    
    # Wait for health check
    echo ""
    echo -n "  Waiting for backend to be healthy"
    for i in {1..20}; do
        echo -n "."
        sleep 2
        if curl -sf http://localhost:3005/health >/dev/null 2>&1; then
            break
        fi
    done
    echo ""
    
    if curl -sf http://localhost:3005/health >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Backend is healthy"
    else
        echo -e "  ${YELLOW}⚠${NC} Backend may still be starting..."
    fi
    
    echo ""
fi

# Final status
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Final Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

docker compose -f "$COMPOSE_FILE" ps

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Zero downtime update completed!${NC}${GREEN}                      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Usage:${NC}"
echo "    ./update-live.sh           # Update frontend + backend"
echo "    ./update-live.sh frontend  # Update frontend only"
echo "    ./update-live.sh backend   # Update backend only"
echo ""
echo "  If you experience issues, check logs:"
echo "    ./logs.sh frontend"
echo "    ./logs.sh backend"
echo ""
