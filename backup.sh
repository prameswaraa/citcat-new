#!/bin/bash

# ============================================================
# KirimChat Backup Script
# Creates backup of database and uploaded files
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
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
QUIET=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --quiet|-q) QUIET=true ;;
        *) ;;
    esac
    shift
done

print_msg() {
    if [ "$QUIET" = false ]; then
        echo -e "$1"
    fi
}

if [ "$QUIET" = false ]; then
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   ${BOLD}KirimChat Backup Script${NC}${CYAN}                                  ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
fi

# Check if installed
if [ ! -f "$SCRIPT_DIR/docker/.env" ]; then
    echo -e "${RED}❌ KirimChat is not installed!${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

print_msg "${YELLOW}[1/4]${NC} ${BOLD}Backing up PostgreSQL database...${NC}"

cd "$SCRIPT_DIR/docker"

# Get database password from .env
source .env

# Dump database
docker compose exec -T postgres pg_dump -U postgres kirimchat > "$BACKUP_DIR/db_$TIMESTAMP.sql" 2>/dev/null

if [ -f "$BACKUP_DIR/db_$TIMESTAMP.sql" ] && [ -s "$BACKUP_DIR/db_$TIMESTAMP.sql" ]; then
    print_msg "  ${GREEN}✓${NC} Database backed up"
else
    print_msg "  ${RED}✗${NC} Database backup failed"
    rm -f "$BACKUP_DIR/db_$TIMESTAMP.sql"
fi

print_msg ""
print_msg "${YELLOW}[2/4]${NC} ${BOLD}Backing up Redis data...${NC}"

# Redis backup (trigger save)
docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" BGSAVE >/dev/null 2>&1 || true
print_msg "  ${GREEN}✓${NC} Redis snapshot triggered"

print_msg ""
print_msg "${YELLOW}[3/4]${NC} ${BOLD}Backing up uploaded files...${NC}"

# Check if uploads volume has data
UPLOADS_CONTAINER_PATH="/app/uploads"
if docker compose exec -T backend ls "$UPLOADS_CONTAINER_PATH" >/dev/null 2>&1; then
    mkdir -p "$BACKUP_DIR/uploads_$TIMESTAMP"
    docker compose cp backend:$UPLOADS_CONTAINER_PATH/. "$BACKUP_DIR/uploads_$TIMESTAMP/" 2>/dev/null || true
    
    if [ -d "$BACKUP_DIR/uploads_$TIMESTAMP" ] && [ "$(ls -A "$BACKUP_DIR/uploads_$TIMESTAMP" 2>/dev/null)" ]; then
        print_msg "  ${GREEN}✓${NC} Uploads backed up"
    else
        print_msg "  ${BLUE}ℹ${NC} No uploads to backup"
        rmdir "$BACKUP_DIR/uploads_$TIMESTAMP" 2>/dev/null || true
    fi
else
    print_msg "  ${BLUE}ℹ${NC} No uploads directory found"
fi

print_msg ""
print_msg "${YELLOW}[4/4]${NC} ${BOLD}Creating archive...${NC}"

cd "$BACKUP_DIR"

# Create tarball
ARCHIVE_NAME="kirimchat_backup_$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE_NAME" \
    "db_$TIMESTAMP.sql" \
    $([ -d "uploads_$TIMESTAMP" ] && echo "uploads_$TIMESTAMP") \
    2>/dev/null || true

# Cleanup individual files
rm -f "db_$TIMESTAMP.sql"
rm -rf "uploads_$TIMESTAMP"

if [ -f "$ARCHIVE_NAME" ]; then
    BACKUP_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    print_msg "  ${GREEN}✓${NC} Archive created: $ARCHIVE_NAME ($BACKUP_SIZE)"
else
    print_msg "  ${RED}✗${NC} Failed to create archive"
fi

# Cleanup old backups (keep last 7)
print_msg ""
print_msg "${BLUE}ℹ${NC} Cleaning up old backups (keeping last 7)..."
ls -t kirimchat_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
print_msg "  ${GREEN}✓${NC} Cleanup complete"

if [ "$QUIET" = false ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ${BOLD}✅ Backup completed!${NC}${GREEN}                                      ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Backup location: $BACKUP_DIR/$ARCHIVE_NAME"
    echo ""
    echo "  To restore from backup:"
    echo "  1. Extract: tar -xzf $ARCHIVE_NAME"
    echo "  2. Restore DB: cat db_*.sql | docker compose exec -T postgres psql -U postgres kirimchat"
    echo ""
fi
