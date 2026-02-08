#!/bin/bash

# ============================================================
# KirimChat Restore Script
# Restores database and files from backup
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
BACKUP_DIR="$SCRIPT_DIR/backups"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat Restore Script${NC}${CYAN}                                 ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if docker is running
if ! docker ps &>/dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    exit 1
fi

# Check if backend container exists
if ! docker ps --format '{{.Names}}' | grep -q 'kirimchat-postgres'; then
    echo -e "${RED}❌ PostgreSQL container not found!${NC}"
    echo "   Please run ./install.sh first."
    exit 1
fi

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found!${NC}"
    echo "   No backups available at: $BACKUP_DIR"
    exit 1
fi

# List available backups
echo -e "${YELLOW}Available backups:${NC}"
echo ""

BACKUPS=($(ls -t "$BACKUP_DIR"/kirimchat_backup_*.tar.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No backup files found!${NC}"
    echo "   Run ./backup.sh first to create a backup."
    exit 1
fi

# Show numbered list
for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE=$(basename "${BACKUPS[$i]}")
    BACKUP_SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    BACKUP_DATE=$(echo "$BACKUP_FILE" | sed 's/kirimchat_backup_\(.*\)\.tar\.gz/\1/' | sed 's/_/ /g')
    echo -e "  ${GREEN}[$((i+1))]${NC} $BACKUP_FILE ($BACKUP_SIZE)"
done

echo ""
read -p "Select backup to restore (1-${#BACKUPS[@]}): " SELECTION

# Validate selection
if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#BACKUPS[@]} ]; then
    echo -e "${RED}❌ Invalid selection!${NC}"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$((SELECTION-1))]}"
BACKUP_NAME=$(basename "$SELECTED_BACKUP")

echo ""
echo -e "${YELLOW}Selected: ${BACKUP_NAME}${NC}"
echo ""

# Warning
echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  WARNING: This will OVERWRITE current data!          ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Type 'RESTORE' to confirm: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
    echo ""
    echo "Restore cancelled."
    exit 0
fi

echo ""

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}[1/4]${NC} ${BOLD}Extracting backup...${NC}"

tar -xzf "$SELECTED_BACKUP" -C "$TEMP_DIR"
echo -e "  ${GREEN}✓${NC} Backup extracted"

# Find the SQL file
SQL_FILE=$(find "$TEMP_DIR" -name "db_*.sql" -type f | head -1)

if [ -z "$SQL_FILE" ]; then
    echo -e "${RED}❌ Database backup not found in archive!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ""
echo -e "${YELLOW}[2/4]${NC} ${BOLD}Stopping backend service...${NC}"

cd "$SCRIPT_DIR/docker"
docker compose stop backend
echo -e "  ${GREEN}✓${NC} Backend stopped"

echo ""
echo -e "${YELLOW}[3/4]${NC} ${BOLD}Restoring database...${NC}"

# Drop and recreate database
docker compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS kirimchat;" 2>/dev/null || true
docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE kirimchat;" 2>/dev/null

# Restore from SQL
cat "$SQL_FILE" | docker compose exec -T postgres psql -U postgres -d kirimchat

echo -e "  ${GREEN}✓${NC} Database restored"

# Restore uploads if exists
UPLOADS_DIR=$(find "$TEMP_DIR" -name "uploads_*" -type d | head -1)

if [ -n "$UPLOADS_DIR" ] && [ -d "$UPLOADS_DIR" ]; then
    echo ""
    echo -e "${YELLOW}[3.5/4]${NC} ${BOLD}Restoring uploads...${NC}"
    
    # Copy uploads to container
    docker compose cp "$UPLOADS_DIR/." backend:/app/uploads/
    echo -e "  ${GREEN}✓${NC} Uploads restored"
fi

echo ""
echo -e "${YELLOW}[4/4]${NC} ${BOLD}Starting services...${NC}"

docker compose up -d
echo -e "  ${GREEN}✓${NC} Services started"

# Cleanup
rm -rf "$TEMP_DIR"

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
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Restore completed!${NC}${GREEN}                                     ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Restored from: ${BACKUP_NAME}${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  If you experience issues, check logs:"
echo "  cd docker && docker compose logs -f"
echo ""
