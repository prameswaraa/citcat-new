#!/bin/bash

# ============================================================
# KirimChat Package Builder
# Creates distributable ZIP package for partners
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/dist"

# Get version from argument or VERSION file
if [ -n "$1" ]; then
    VERSION="$1"
else
    if [ -f "$SCRIPT_DIR/VERSION" ]; then
        VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
    else
        VERSION=$(date +%Y%m%d)
    fi
fi

PACKAGE_NAME="kirimchat-v${VERSION}"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ${BOLD}KirimChat Package Builder${NC}${CYAN}                                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Version: ${GREEN}${VERSION}${NC}"
echo ""

# Check if VERSION file matches
if [ -f "$SCRIPT_DIR/VERSION" ]; then
    FILE_VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
    if [ "$VERSION" != "$FILE_VERSION" ]; then
        echo -e "${YELLOW}⚠️  Warning: Building v${VERSION} but VERSION file says v${FILE_VERSION}${NC}"
        read -p "  Continue anyway? (y/n): " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "  Cancelled."
            exit 0
        fi
    fi
fi

# Check CHANGELOG
if [ -f "$SCRIPT_DIR/CHANGELOG.md" ]; then
    if ! grep -q "\[${VERSION}\]" "$SCRIPT_DIR/CHANGELOG.md"; then
        echo -e "${YELLOW}⚠️  Warning: Version ${VERSION} not found in CHANGELOG.md${NC}"
        read -p "  Continue anyway? (y/n): " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "  Please update CHANGELOG.md first."
            exit 0
        fi
    fi
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}[1/5]${NC} ${BOLD}Preparing package...${NC}"

# Create temp directory for package
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"
mkdir -p "$PACKAGE_DIR"

echo -e "  ${GREEN}✓${NC} Temp directory created"

echo ""
echo -e "${YELLOW}[2/5]${NC} ${BOLD}Copying files...${NC}"

# Copy apps (source code)
cp -r "$SCRIPT_DIR/apps" "$PACKAGE_DIR/"
echo -e "  ${GREEN}✓${NC} apps/ copied"

# Copy docker folder
cp -r "$SCRIPT_DIR/docker" "$PACKAGE_DIR/"
# Remove any .env file (only keep .env.example)
rm -f "$PACKAGE_DIR/docker/.env"
echo -e "  ${GREEN}✓${NC} docker/ copied"

# Copy installer scripts
cp "$SCRIPT_DIR/install.sh" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/update.sh" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/update-live.sh" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/backup.sh" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/restore.sh" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/import-db.sh" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/uninstall.sh" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/create-admin.sh" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/status.sh" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/logs.sh" "$PACKAGE_DIR/" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Scripts copied"

# Copy README
cp "$SCRIPT_DIR/README-INSTALLER.md" "$PACKAGE_DIR/README.md"
echo -e "  ${GREEN}✓${NC} README copied"

# Copy VERSION and CHANGELOG
cp "$SCRIPT_DIR/VERSION" "$PACKAGE_DIR/" 2>/dev/null || echo "$VERSION" > "$PACKAGE_DIR/VERSION"
cp "$SCRIPT_DIR/CHANGELOG.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/CONFIGURATION.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/LICENSE-TERMS.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/TROUBLESHOOTING.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/MIGRATION.md" "$PACKAGE_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/UPDATE-GUIDE.md" "$PACKAGE_DIR/" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Documentation copied"

# Copy package.json and workspace config (needed for build)
cp "$SCRIPT_DIR/package.json" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/pnpm-workspace.yaml" "$PACKAGE_DIR/"
cp "$SCRIPT_DIR/pnpm-lock.yaml" "$PACKAGE_DIR/" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Package configs copied"

echo ""
echo -e "${YELLOW}[3/5]${NC} ${BOLD}Cleaning up...${NC}"

# Remove unnecessary files
find "$PACKAGE_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PACKAGE_DIR" -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PACKAGE_DIR" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PACKAGE_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true
find "$PACKAGE_DIR" -name ".env" -type f -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name ".env.local" -type f -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name "*.log" -type f -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true
find "$PACKAGE_DIR" -name "Thumbs.db" -type f -delete 2>/dev/null || true

echo -e "  ${GREEN}✓${NC} Cleaned up build artifacts and sensitive files"

echo ""
echo -e "${YELLOW}[4/5]${NC} ${BOLD}Creating ZIP archive...${NC}"

cd "$TEMP_DIR"
zip -rq "$OUTPUT_DIR/${PACKAGE_NAME}.zip" "$PACKAGE_NAME"

# Cleanup temp
rm -rf "$TEMP_DIR"

# Get file size
ZIP_SIZE=$(du -h "$OUTPUT_DIR/${PACKAGE_NAME}.zip" | cut -f1)

echo -e "  ${GREEN}✓${NC} ZIP created: ${PACKAGE_NAME}.zip (${ZIP_SIZE})"

echo ""
echo -e "${YELLOW}[5/5]${NC} ${BOLD}Generating checksums...${NC}"

cd "$OUTPUT_DIR"
sha256sum "${PACKAGE_NAME}.zip" > "${PACKAGE_NAME}.zip.sha256"
echo -e "  ${GREEN}✓${NC} SHA256 checksum created"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ${BOLD}✅ Package created successfully!${NC}${GREEN}                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  📦 Package: $OUTPUT_DIR/${PACKAGE_NAME}.zip"
echo "  📏 Size: ${ZIP_SIZE}"
echo "  🔐 Checksum: $OUTPUT_DIR/${PACKAGE_NAME}.zip.sha256"
echo ""
echo "  📋 Contents:"
echo "     - Full source code (apps/backend, apps/frontend)"
echo "     - Docker configuration (docker-compose, Caddyfile)"
echo "     - Installer scripts (install, update, backup, restore, etc)"
echo "     - Utility scripts (status, logs, import-db, update-live)"
echo "     - Documentation (README, CHANGELOG, TROUBLESHOOTING, etc)"
echo ""
echo "  This package is ready for distribution to partners."
echo ""
