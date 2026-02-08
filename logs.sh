#!/bin/bash

# ============================================================================
# KirimChat - Log Viewer Script
# View logs from all or specific Docker containers
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"
DEFAULT_TAIL=100

# Available services
SERVICES=("postgres" "redis" "backend" "frontend" "caddy")

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              KirimChat - Log Viewer                          ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./logs.sh                    # View logs from all services (last $DEFAULT_TAIL lines)"
    echo "  ./logs.sh <service>          # View logs from specific service"
    echo "  ./logs.sh -f                 # Follow logs from all services (real-time)"
    echo "  ./logs.sh <service> -f       # Follow logs from specific service"
    echo "  ./logs.sh -n 200             # View last 200 lines from all services"
    echo "  ./logs.sh <service> -n 200   # View last 200 lines from specific service"
    echo ""
    echo -e "${YELLOW}Available services:${NC}"
    echo "  postgres   - PostgreSQL database"
    echo "  redis      - Redis cache"
    echo "  backend    - Backend API (Hono)"
    echo "  frontend   - Frontend (Next.js)"
    echo "  caddy      - Reverse proxy (SSL)"
    echo "  all        - All services (default)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./logs.sh backend            # View backend logs"
    echo "  ./logs.sh backend -f         # Follow backend logs"
    echo "  ./logs.sh frontend -n 50     # View last 50 lines of frontend logs"
    echo "  ./logs.sh -f                 # Follow all logs"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}Error: Docker daemon is not running${NC}"
        exit 1
    fi
}

check_compose_file() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}Error: docker-compose.yml not found at $COMPOSE_FILE${NC}"
        echo "Make sure you're running this script from the KirimChat directory."
        exit 1
    fi
}

is_valid_service() {
    local service=$1
    for s in "${SERVICES[@]}"; do
        if [ "$s" == "$service" ]; then
            return 0
        fi
    done
    return 1
}

view_logs() {
    local service=$1
    local follow=$2
    local tail_lines=$3
    
    local cmd="docker compose -f $COMPOSE_FILE logs"
    
    # Add tail option
    cmd="$cmd --tail=$tail_lines"
    
    # Add follow option if requested
    if [ "$follow" == "true" ]; then
        cmd="$cmd -f"
    fi
    
    # Add timestamps
    cmd="$cmd --timestamps"
    
    # Add service if specified
    if [ -n "$service" ] && [ "$service" != "all" ]; then
        cmd="$cmd $service"
        echo -e "${GREEN}Viewing logs for: ${YELLOW}$service${NC}"
    else
        echo -e "${GREEN}Viewing logs for: ${YELLOW}all services${NC}"
    fi
    
    if [ "$follow" == "true" ]; then
        echo -e "${CYAN}Following logs... Press Ctrl+C to stop${NC}"
    fi
    
    echo ""
    
    # Execute
    eval $cmd
}

# Main
print_header
check_docker
check_compose_file

# Parse arguments
SERVICE=""
FOLLOW="false"
TAIL_LINES=$DEFAULT_TAIL

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW="true"
            shift
            ;;
        -n|--tail)
            TAIL_LINES="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        all)
            SERVICE="all"
            shift
            ;;
        *)
            # Check if it's a valid service name
            if is_valid_service "$1"; then
                SERVICE="$1"
            else
                echo -e "${RED}Error: Unknown service '$1'${NC}"
                echo ""
                print_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# View logs
view_logs "$SERVICE" "$FOLLOW" "$TAIL_LINES"
