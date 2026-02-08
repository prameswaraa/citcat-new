#!/bin/bash

# ============================================================
# KirimChat - Create Admin User Script
# Creates default admin user for first-time setup
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
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat - Create Admin User${NC}${CYAN}                            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if docker is running
if ! docker ps &>/dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Check if backend container exists
if ! docker ps --format '{{.Names}}' | grep -q 'kirimchat-backend'; then
    echo -e "${RED}❌ Backend container not found!${NC}"
    echo "   Please run ./install.sh first."
    exit 1
fi

# Default values
DEFAULT_EMAIL="admin@kirimchat.com"
DEFAULT_PASSWORD="Admin123!"
DEFAULT_NAME="Admin KirimChat"

echo -e "${YELLOW}Configure admin user:${NC}"
echo ""

# Get email
read -p "  Admin email [$DEFAULT_EMAIL]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-$DEFAULT_EMAIL}

# Get password
read -sp "  Admin password [$DEFAULT_PASSWORD]: " ADMIN_PASSWORD
echo ""
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$DEFAULT_PASSWORD}

# Get name
read -p "  Admin name [$DEFAULT_NAME]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-$DEFAULT_NAME}

echo ""
echo -e "${YELLOW}Creating admin user...${NC}"
echo ""

# Run seed in backend container
docker exec -e ADMIN_EMAIL="$ADMIN_EMAIL" \
            -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
            -e ADMIN_NAME="$ADMIN_NAME" \
            kirimchat-backend npx tsx src/db/seed.ts

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Admin user created successfully!${NC}${GREEN}                      ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║   📧 Email: ${ADMIN_EMAIL}${NC}"
echo -e "${GREEN}║   🔑 Password: (as entered)                               ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║   ${YELLOW}⚠️  Please change password after first login!${NC}${GREEN}            ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
