#!/bin/bash

# ============================================================
# KirimChat One-Click Installer
# Copyright (c) KirimChat - All Rights Reserved
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get version
VERSION="unknown"
if [ -f "$SCRIPT_DIR/VERSION" ]; then
    VERSION=$(cat "$SCRIPT_DIR/VERSION" | tr -d '[:space:]')
fi

# Print banner
print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}║   ${BOLD}${GREEN}KirimChat One-Click Installer${NC}${CYAN}                          ║${NC}"
    echo -e "${CYAN}║   ${NC}White-Label WhatsApp Business Platform${CYAN}                 ║${NC}"
    echo -e "${CYAN}║   ${NC}Version: ${GREEN}${VERSION}${NC}${CYAN}                                         ║${NC}"
    echo -e "${CYAN}║                                                           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Print step header
print_step() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}[$1/6]${NC} ${BOLD}$2${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Print success
print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

# Print error
print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

# Print warning
print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

# Print info
print_info() {
    echo -e "  ${BLUE}ℹ${NC} $1"
}

# Generate random string (hex)
generate_hex() {
    openssl rand -hex $1 2>/dev/null || head -c $1 /dev/urandom | xxd -p | tr -d '\n' | head -c $(($1 * 2))
}

# Generate random string (base64)
generate_base64() {
    openssl rand -base64 $1 2>/dev/null || head -c $1 /dev/urandom | base64 | tr -d '\n' | head -c $(($1 * 4 / 3))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================================
# STEP 1: System Requirements Check
# ============================================================
check_system() {
    print_step "1" "Checking System Requirements"
    
    local errors=0
    
    # Check if running as root or with sudo
    if [ "$EUID" -eq 0 ]; then
        print_success "Running with root privileges"
    else
        print_warning "Not running as root. Some operations may require sudo."
    fi
    
    # Check Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
        print_success "Docker installed (v$DOCKER_VERSION)"
    else
        print_error "Docker not found!"
        echo ""
        echo "   Please install Docker first:"
        echo "   curl -fsSL https://get.docker.com | sh"
        echo ""
        errors=$((errors + 1))
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
        print_success "Docker Compose installed (v$COMPOSE_VERSION)"
    else
        print_error "Docker Compose not found!"
        echo ""
        echo "   Docker Compose is included with Docker Desktop."
        echo "   For Linux servers, install with:"
        echo "   sudo apt-get install docker-compose-plugin"
        echo ""
        errors=$((errors + 1))
    fi
    
    # Check if Docker is running
    if docker info >/dev/null 2>&1; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running!"
        echo ""
        echo "   Please start Docker:"
        echo "   sudo systemctl start docker"
        echo ""
        errors=$((errors + 1))
    fi
    
    # Check port 80
    if ! ss -tuln 2>/dev/null | grep -q ':80 ' && ! netstat -tuln 2>/dev/null | grep -q ':80 '; then
        print_success "Port 80 is available"
    else
        print_error "Port 80 is already in use!"
        echo "   Please stop the service using port 80 (e.g., nginx, apache)"
        errors=$((errors + 1))
    fi
    
    # Check port 443
    if ! ss -tuln 2>/dev/null | grep -q ':443 ' && ! netstat -tuln 2>/dev/null | grep -q ':443 '; then
        print_success "Port 443 is available"
    else
        print_error "Port 443 is already in use!"
        echo "   Please stop the service using port 443"
        errors=$((errors + 1))
    fi
    
    # Check RAM
    if command_exists free; then
        TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
        if [ "$TOTAL_RAM" -ge 2000 ]; then
            print_success "RAM: ${TOTAL_RAM}MB (recommended: 2GB+)"
        else
            print_warning "RAM: ${TOTAL_RAM}MB (recommended: 2GB+)"
            echo "   Low memory may cause build issues"
        fi
    fi
    
    # Check disk space
    if command_exists df; then
        DISK_FREE=$(df -BG . | awk 'NR==2 {print $4}' | tr -d 'G')
        if [ "$DISK_FREE" -ge 10 ]; then
            print_success "Disk space: ${DISK_FREE}GB free (recommended: 10GB+)"
        else
            print_warning "Disk space: ${DISK_FREE}GB free (recommended: 10GB+)"
        fi
    fi
    
    # Check required commands
    for cmd in openssl curl wget; do
        if command_exists $cmd; then
            print_success "$cmd is available"
        else
            print_warning "$cmd not found (optional but recommended)"
        fi
    done
    
    if [ $errors -gt 0 ]; then
        echo ""
        print_error "Please fix the errors above and run the installer again."
        exit 1
    fi
}

# ============================================================
# STEP 2: Interactive Configuration
# ============================================================
get_configuration() {
    print_step "2" "Configuration Setup"
    
    echo ""
    echo -e "  ${CYAN}Please provide the following information:${NC}"
    echo ""
    
    # Get domain
    while true; do
        read -p "  Enter your domain (e.g., app.yourdomain.com): " DOMAIN
        DOMAIN=$(echo "$DOMAIN" | tr -d ' ' | tr '[:upper:]' '[:lower:]')
        
        if [[ -z "$DOMAIN" ]]; then
            print_error "Domain cannot be empty"
        elif [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
            print_error "Please enter a valid domain (e.g., app.yourdomain.com)"
        else
            break
        fi
    done
    
    # Get email for SSL
    while true; do
        read -p "  Enter email for SSL certificate: " SSL_EMAIL
        SSL_EMAIL=$(echo "$SSL_EMAIL" | tr -d ' ')
        
        if [[ "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            break
        else
            print_error "Please enter a valid email address"
        fi
    done
    
    echo ""
    print_success "Domain: ${DOMAIN}"
    print_success "Email: ${SSL_EMAIL}"
    
    # Confirm
    echo ""
    read -p "  Is this correct? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
        get_configuration
    fi
}

# ============================================================
# STEP 3: Generate Secrets
# ============================================================
generate_secrets() {
    print_step "3" "Generating Secure Secrets"
    
    # Generate all secrets
    DB_PASSWORD=$(generate_hex 16)
    print_success "Database password generated"
    
    REDIS_PASSWORD=$(generate_hex 16)
    print_success "Redis password generated"
    
    JWT_SECRET=$(generate_hex 32)
    print_success "JWT secret generated"
    
    BETTER_AUTH_SECRET=$(generate_hex 32)
    print_success "Better Auth secret generated"
    
    WEBHOOK_VERIFY_TOKEN=$(generate_hex 16)
    print_success "Webhook verify token generated"
    
    WABA_TOKEN_ENCRYPTION_KEY=$(generate_base64 32)
    print_success "WABA encryption key generated"
    
    # Create .env file
    print_info "Creating environment configuration..."
    
    cat > "$SCRIPT_DIR/docker/.env" << EOF
# ============================================================
# KirimChat Environment Configuration
# Generated: $(date)
# Domain: ${DOMAIN}
# ============================================================

# Domain Configuration
DOMAIN=${DOMAIN}
SSL_EMAIL=${SSL_EMAIL}

# Database
DB_NAME=kirimchat
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Auth Secrets
JWT_SECRET=${JWT_SECRET}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# WhatsApp
WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
WABA_TOKEN_ENCRYPTION_KEY=${WABA_TOKEN_ENCRYPTION_KEY}

# Optional: SMTP (configure via admin dashboard)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=KirimChat
SMTP_SECURE=false

# Optional: Meta/WhatsApp Business
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_CONFIG_ID=

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional: OpenAI
OPENAI_API_KEY=

# Optional: Duitku Payment
DUITKU_MERCHANT_CODE=
DUITKU_API_KEY=
DUITKU_CALLBACK_URL=
EOF

    print_success "Environment file created: docker/.env"
    
    # Save secrets backup
    cat > "$SCRIPT_DIR/secrets.txt" << EOF
╔═══════════════════════════════════════════════════════════════════════╗
║                    KIRIMCHAT SECRETS - BACKUP THIS FILE!              ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Generated: $(date)
║  Domain: ${DOMAIN}
╠═══════════════════════════════════════════════════════════════════════╣
║
║  DATABASE
║  ────────
║  DB_PASSWORD: ${DB_PASSWORD}
║
║  REDIS
║  ─────
║  REDIS_PASSWORD: ${REDIS_PASSWORD}
║
║  AUTHENTICATION
║  ──────────────
║  JWT_SECRET: ${JWT_SECRET}
║  BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
║
║  WHATSAPP
║  ────────
║  WEBHOOK_VERIFY_TOKEN: ${WEBHOOK_VERIFY_TOKEN}
║  WABA_TOKEN_ENCRYPTION_KEY: ${WABA_TOKEN_ENCRYPTION_KEY}
║
╚═══════════════════════════════════════════════════════════════════════╝

⚠️  IMPORTANT: Store this file in a secure location!
    You will need these secrets for recovery or troubleshooting.
EOF

    chmod 600 "$SCRIPT_DIR/secrets.txt"
    print_success "Secrets backup saved: secrets.txt"
    print_warning "Please backup secrets.txt to a secure location!"
}

# ============================================================
# STEP 4: Build Docker Images
# ============================================================
build_images() {
    print_step "4" "Building Docker Images"
    
    echo ""
    print_info "This may take 5-10 minutes depending on your server speed..."
    echo ""
    
    cd "$SCRIPT_DIR/docker"
    
    # Build images
    echo -e "  ${BLUE}Building frontend and backend images...${NC}"
    echo ""
    
    if docker compose build --no-cache 2>&1 | while read line; do echo "  $line"; done; then
        print_success "Docker images built successfully"
    else
        print_error "Failed to build Docker images"
        echo ""
        echo "  Please check the error messages above."
        echo "  You can try running manually:"
        echo "  cd docker && docker compose build --no-cache"
        exit 1
    fi
}

# ============================================================
# STEP 5: Start Services
# ============================================================
start_services() {
    print_step "5" "Starting Services"
    
    cd "$SCRIPT_DIR/docker"
    
    # Start all services
    print_info "Starting all services..."
    docker compose up -d
    
    echo ""
    print_info "Waiting for services to be healthy..."
    echo ""
    
    # Wait for postgres
    echo -n "  PostgreSQL: "
    for i in {1..30}; do
        if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}Ready${NC}"
            break
        fi
        echo -n "."
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}Timeout${NC}"
        fi
    done
    
    # Wait for redis
    echo -n "  Redis: "
    for i in {1..30}; do
        if docker compose exec -T redis redis-cli -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
            echo -e "${GREEN}Ready${NC}"
            break
        fi
        echo -n "."
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}Timeout${NC}"
        fi
    done
    
    # Wait for backend
    echo -n "  Backend: "
    for i in {1..60}; do
        if docker compose exec -T backend wget -q --spider http://localhost:3005/health 2>/dev/null; then
            echo -e "${GREEN}Ready${NC}"
            break
        fi
        echo -n "."
        sleep 3
        if [ $i -eq 60 ]; then
            echo -e "${YELLOW}Still starting...${NC}"
        fi
    done
    
    # Wait for frontend
    echo -n "  Frontend: "
    for i in {1..60}; do
        if docker compose exec -T frontend wget -q --spider http://localhost:3000 2>/dev/null; then
            echo -e "${GREEN}Ready${NC}"
            break
        fi
        echo -n "."
        sleep 3
        if [ $i -eq 60 ]; then
            echo -e "${YELLOW}Still starting...${NC}"
        fi
    done
    
    # Wait for Caddy
    echo -n "  Caddy (SSL): "
    sleep 10  # Give Caddy time to obtain certificate
    if docker compose ps caddy | grep -q "Up"; then
        echo -e "${GREEN}Ready${NC}"
    else
        echo -e "${YELLOW}Check logs${NC}"
    fi
    
    echo ""
}

# ============================================================
# STEP 6: Verify Installation
# ============================================================
verify_installation() {
    print_step "6" "Verifying Installation"
    
    cd "$SCRIPT_DIR/docker"
    
    local all_ok=true
    local db_push_failed=false
    
    # Check if db push failed in backend container
    if docker compose exec -T backend test -f /tmp/.db_push_failed 2>/dev/null; then
        db_push_failed=true
    fi
    
    # Check all containers are running
    RUNNING=$(docker compose ps --format json 2>/dev/null | grep -c '"running"' || docker compose ps | grep -c "Up" || echo "0")
    
    if [ "$RUNNING" -ge 5 ]; then
        print_success "All 5 services are running"
    else
        print_warning "Some services may not be running correctly"
        all_ok=false
    fi
    
    # Test backend health
    if curl -sf "http://localhost:3005/health" >/dev/null 2>&1; then
        print_success "Backend API is responding"
    else
        print_warning "Backend API health check failed"
        all_ok=false
    fi
    
    # Test frontend
    if curl -sf "http://localhost:3000" >/dev/null 2>&1; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend health check failed"
        all_ok=false
    fi
    
    # Show status
    echo ""
    docker compose ps
    
    # Print result
    echo ""
    if [ "$all_ok" = true ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}║   ${BOLD}✅ KirimChat installed successfully!${NC}${GREEN}                              ║${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}║   🌐 Your KirimChat is available at:                                  ║${NC}"
        echo -e "${GREEN}║      ${BOLD}https://${DOMAIN}${NC}${GREEN}                                       ║${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}║   📁 Secrets backup: ./secrets.txt                                    ║${NC}"
        echo -e "${GREEN}║      ${RED}⚠️  BACKUP THIS FILE TO A SECURE LOCATION!${NC}${GREEN}                     ║${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}╠═══════════════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}║   📝 Useful Commands:                                                 ║${NC}"
        echo -e "${GREEN}║      View logs:     cd docker && docker compose logs -f              ║${NC}"
        echo -e "${GREEN}║      Restart:       cd docker && docker compose restart              ║${NC}"
        echo -e "${GREEN}║      Update:        ./update.sh                                       ║${NC}"
        echo -e "${GREEN}║      Backup:        ./backup.sh                                       ║${NC}"
        echo -e "${GREEN}║                                                                       ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
        
        # Show db push warning if failed
        if [ "$db_push_failed" = true ]; then
            echo ""
            echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${YELLOW}║   ⚠️  Database schema sync (db push) failed during startup            ║${NC}"
            echo -e "${YELLOW}║                                                                       ║${NC}"
            echo -e "${YELLOW}║   Please run manually after installation:                             ║${NC}"
            echo -e "${YELLOW}║   ${BOLD}docker exec -it kirimchat-backend npx prisma db push${NC}${YELLOW}               ║${NC}"
            echo -e "${YELLOW}║                                                                       ║${NC}"
            echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
        fi
    else
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║                                                                       ║${NC}"
        echo -e "${YELLOW}║   ⚠️  Installation completed with warnings                            ║${NC}"
        echo -e "${YELLOW}║                                                                       ║${NC}"
        echo -e "${YELLOW}║   Some services may still be starting up.                             ║${NC}"
        echo -e "${YELLOW}║   Please wait a few minutes and check:                                ║${NC}"
        echo -e "${YELLOW}║                                                                       ║${NC}"
        echo -e "${YELLOW}║   🌐 https://${DOMAIN}                                        ║${NC}"
        echo -e "${YELLOW}║                                                                       ║${NC}"
        echo -e "${YELLOW}║   If issues persist, check logs:                                      ║${NC}"
        echo -e "${YELLOW}║   cd docker && docker compose logs                                   ║${NC}"
        echo -e "${YELLOW}║                                                                       ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
        
        # Show db push warning if failed
        if [ "$db_push_failed" = true ]; then
            echo ""
            echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${RED}║   ⚠️  Database schema sync (db push) failed during startup            ║${NC}"
            echo -e "${RED}║                                                                       ║${NC}"
            echo -e "${RED}║   Please run manually after installation:                             ║${NC}"
            echo -e "${RED}║   ${BOLD}docker exec -it kirimchat-backend npx prisma db push${NC}${RED}               ║${NC}"
            echo -e "${RED}║                                                                       ║${NC}"
            echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
        fi
    fi
    
    echo ""
}

# ============================================================
# Main Execution
# ============================================================
main() {
    print_banner
    
    # Check if already installed
    if [ -f "$SCRIPT_DIR/docker/.env" ]; then
        echo -e "${YELLOW}⚠️  Existing installation detected!${NC}"
        echo ""
        read -p "  Do you want to reinstall? This will recreate containers. (y/n): " REINSTALL
        if [[ "$REINSTALL" != "y" && "$REINSTALL" != "Y" ]]; then
            echo ""
            echo "  Installation cancelled."
            echo "  To update, use: ./update.sh"
            exit 0
        fi
        echo ""
        
        # Stop existing containers
        cd "$SCRIPT_DIR/docker"
        docker compose down 2>/dev/null || true
    fi
    
    check_system
    get_configuration
    generate_secrets
    build_images
    start_services
    verify_installation
}

# Run main function
main "$@"
