#!/bin/bash

# ============================================================
# KirimChat Uninstall Script
# Removes all containers and optionally data
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                                                           ║${NC}"
echo -e "${RED}║   ${BOLD}⚠️  KirimChat Uninstall Script${NC}${RED}                          ║${NC}"
echo -e "${RED}║                                                           ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if installed
if [ ! -f "$SCRIPT_DIR/docker/.env" ]; then
    echo -e "${YELLOW}⚠️  KirimChat does not appear to be installed.${NC}"
    echo ""
    exit 0
fi

echo -e "${YELLOW}This will:${NC}"
echo "  • Stop all KirimChat containers"
echo "  • Remove all KirimChat containers"
echo "  • Optionally remove all data (database, redis, uploads)"
echo ""

echo -e "${RED}${BOLD}⚠️  WARNING: This action cannot be undone!${NC}"
echo ""

# Confirm uninstall
read -p "Type 'UNINSTALL' to confirm: " CONFIRM
if [ "$CONFIRM" != "UNINSTALL" ]; then
    echo ""
    echo "Uninstall cancelled."
    exit 0
fi

echo ""

# Ask about data
echo -e "${YELLOW}Do you want to delete all data?${NC}"
echo "  This includes: database, redis cache, uploaded files"
echo ""
read -p "Delete all data? (y/n): " DELETE_DATA

echo ""

# Step 1: Stop services
echo -e "${YELLOW}[1/3]${NC} ${BOLD}Stopping services...${NC}"
cd "$SCRIPT_DIR/docker"

docker compose down 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Services stopped"

echo ""

# Step 2: Remove containers
echo -e "${YELLOW}[2/3]${NC} ${BOLD}Removing containers...${NC}"

if [[ "$DELETE_DATA" == "y" || "$DELETE_DATA" == "Y" ]]; then
    docker compose down -v --remove-orphans 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Containers and volumes removed"
else
    docker compose down --remove-orphans 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Containers removed (data preserved)"
fi

echo ""

# Step 3: Remove images (optional)
echo -e "${YELLOW}[3/3]${NC} ${BOLD}Cleanup...${NC}"

read -p "Remove Docker images? (y/n): " REMOVE_IMAGES
if [[ "$REMOVE_IMAGES" == "y" || "$REMOVE_IMAGES" == "Y" ]]; then
    docker rmi kirimchat-frontend kirimchat-backend 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Images removed"
else
    echo -e "  ${BLUE}ℹ${NC} Images preserved"
fi

# Remove .env file
read -p "Remove configuration (.env)? (y/n): " REMOVE_ENV
if [[ "$REMOVE_ENV" == "y" || "$REMOVE_ENV" == "Y" ]]; then
    rm -f "$SCRIPT_DIR/docker/.env"
    echo -e "  ${GREEN}✓${NC} Configuration removed"
else
    echo -e "  ${BLUE}ℹ${NC} Configuration preserved"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ KirimChat has been uninstalled${NC}${GREEN}                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DELETE_DATA" != "y" && "$DELETE_DATA" != "Y" ]]; then
    echo "  Your data has been preserved in Docker volumes."
    echo "  To completely remove, run:"
    echo "  docker volume rm docker_postgres_data docker_redis_data docker_uploads_data"
    echo ""
fi

echo "  To reinstall, run: ./install.sh"
echo ""
