#!/bin/bash

# ============================================================
# KirimChat Import Database Script
# Import database from external SQL file
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
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat Import Database${NC}${CYAN}                                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check arguments
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./import-db.sh <sql_file>"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./import-db.sh backup.sql"
    echo "  ./import-db.sh /path/to/database.sql"
    echo ""
    exit 1
fi

SQL_FILE="$1"

# Check if file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ File not found: $SQL_FILE${NC}"
    exit 1
fi

# Check file size
FILE_SIZE=$(du -h "$SQL_FILE" | cut -f1)
echo -e "  SQL File: ${CYAN}$SQL_FILE${NC}"
echo -e "  Size: ${CYAN}$FILE_SIZE${NC}"
echo ""

# Check if docker is running
if ! docker ps &>/dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Check if PostgreSQL container exists
if ! docker ps --format '{{.Names}}' | grep -q 'kirimchat-postgres'; then
    echo -e "${RED}❌ PostgreSQL container not found!${NC}"
    echo "   Please run ./install.sh first."
    exit 1
fi

# Warning
echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  WARNING: This will OVERWRITE current database!      ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Type 'IMPORT' to confirm: " CONFIRM
if [ "$CONFIRM" != "IMPORT" ]; then
    echo ""
    echo "Import cancelled."
    exit 0
fi

echo ""

# Step 1: Create backup of current database (just in case)
echo -e "${YELLOW}[1/4]${NC} ${BOLD}Backing up current database...${NC}"

BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$SCRIPT_DIR/backups/pre_import_${BACKUP_TIMESTAMP}.sql"
mkdir -p "$SCRIPT_DIR/backups"

docker exec kirimchat-postgres pg_dump -U postgres kirimchat > "$BACKUP_FILE" 2>/dev/null || true

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo -e "  ${GREEN}✓${NC} Backup saved: backups/pre_import_${BACKUP_TIMESTAMP}.sql"
else
    echo -e "  ${YELLOW}⚠${NC} No existing data to backup (new installation)"
    rm -f "$BACKUP_FILE"
fi

# Step 2: Stop backend
echo ""
echo -e "${YELLOW}[2/4]${NC} ${BOLD}Stopping backend service...${NC}"

docker compose -f "$COMPOSE_FILE" stop backend 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Backend stopped"

# Step 3: Import database
echo ""
echo -e "${YELLOW}[3/4]${NC} ${BOLD}Importing database...${NC}"

# Drop and recreate database
docker exec kirimchat-postgres psql -U postgres -c "DROP DATABASE IF EXISTS kirimchat;" 2>/dev/null || true
docker exec kirimchat-postgres psql -U postgres -c "CREATE DATABASE kirimchat;" 2>/dev/null

# Import SQL file
echo "  Importing... (this may take a while)"
cat "$SQL_FILE" | docker exec -i kirimchat-postgres psql -U postgres -d kirimchat 2>&1 | tail -5

echo -e "  ${GREEN}✓${NC} Database imported"

# Step 4: Start services
echo ""
echo -e "${YELLOW}[4/4]${NC} ${BOLD}Starting services...${NC}"

docker compose -f "$COMPOSE_FILE" up -d
echo -e "  ${GREEN}✓${NC} Services started"

# Wait for health
echo ""
echo -n "  Waiting for services to be healthy"
for i in {1..15}; do
    echo -n "."
    sleep 2
done
echo ""

# Verify
if curl -sf "http://localhost:3005/health" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend is healthy"
else
    echo -e "  ${YELLOW}⚠${NC} Backend may still be starting..."
    echo "     Check logs: ./logs.sh backend"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Database import completed!${NC}${GREEN}                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Imported from: $SQL_FILE"
echo ""
echo "  If you experience issues:"
echo "    - Check logs: ./logs.sh backend"
echo "    - Rollback: ./import-db.sh backups/pre_import_${BACKUP_TIMESTAMP}.sql"
echo ""
