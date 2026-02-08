#!/bin/bash

# ============================================================================
# KirimChat - Status Check Script
# Check health and status of all Docker containers
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/docker/.env"

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              KirimChat - Status Check                        ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${MAGENTA}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker daemon is not running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker is running${NC}"
}

get_status_icon() {
    local status=$1
    case $status in
        "running")
            echo -e "${GREEN}●${NC}"
            ;;
        "healthy")
            echo -e "${GREEN}●${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}●${NC}"
            ;;
        "starting")
            echo -e "${YELLOW}●${NC}"
            ;;
        "exited"|"dead")
            echo -e "${RED}●${NC}"
            ;;
        *)
            echo -e "${YELLOW}●${NC}"
            ;;
    esac
}

get_health_text() {
    local health=$1
    case $health in
        "healthy")
            echo -e "${GREEN}Healthy${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}Unhealthy${NC}"
            ;;
        "starting")
            echo -e "${YELLOW}Starting${NC}"
            ;;
        *)
            echo -e "${YELLOW}N/A${NC}"
            ;;
    esac
}

check_container_status() {
    local container=$1
    local display_name=$2
    
    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        printf "  %-20s ${RED}● Not Created${NC}\n" "$display_name"
        return 1
    fi
    
    # Get container info
    local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
    local health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null)
    local uptime=$(docker inspect --format='{{.State.StartedAt}}' "$container" 2>/dev/null)
    
    # Calculate uptime
    if [ "$status" == "running" ]; then
        local started=$(date -d "$uptime" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${uptime:0:19}" +%s 2>/dev/null || echo "0")
        local now=$(date +%s)
        local diff=$((now - started))
        
        if [ $diff -lt 60 ]; then
            uptime_str="${diff}s"
        elif [ $diff -lt 3600 ]; then
            uptime_str="$((diff / 60))m"
        elif [ $diff -lt 86400 ]; then
            uptime_str="$((diff / 3600))h $((diff % 3600 / 60))m"
        else
            uptime_str="$((diff / 86400))d $((diff % 86400 / 3600))h"
        fi
    else
        uptime_str="-"
    fi
    
    # Get icon
    if [ "$health" != "none" ]; then
        icon=$(get_status_icon "$health")
        health_text=$(get_health_text "$health")
    else
        icon=$(get_status_icon "$status")
        health_text="-"
    fi
    
    # Format status
    if [ "$status" == "running" ]; then
        status_text="${GREEN}Running${NC}"
    else
        status_text="${RED}${status^}${NC}"
    fi
    
    printf "  $icon %-18s %-15b %-15b %-10s\n" "$display_name" "$status_text" "$health_text" "$uptime_str"
}

check_port() {
    local port=$1
    local name=$2
    
    if command -v nc &> /dev/null; then
        if nc -z localhost $port 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Port $port ($name) is open"
        else
            echo -e "  ${YELLOW}○${NC} Port $port ($name) is not accessible locally"
        fi
    elif command -v curl &> /dev/null; then
        if curl -s --connect-timeout 2 "http://localhost:$port" &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Port $port ($name) is responding"
        else
            echo -e "  ${YELLOW}○${NC} Port $port ($name) is not responding"
        fi
    fi
}

check_disk_usage() {
    echo ""
    
    # Docker disk usage
    local docker_usage=$(docker system df --format "{{.Size}}" 2>/dev/null | head -1)
    echo -e "  Docker Images:     ${CYAN}$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null | grep Images | cut -d: -f2 | xargs)${NC}"
    echo -e "  Docker Containers: ${CYAN}$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null | grep Containers | cut -d: -f2 | xargs)${NC}"
    echo -e "  Docker Volumes:    ${CYAN}$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null | grep Volumes | cut -d: -f2 | xargs)${NC}"
    
    # System disk
    echo ""
    local disk_usage=$(df -h / 2>/dev/null | tail -1)
    local disk_used=$(echo $disk_usage | awk '{print $3}')
    local disk_total=$(echo $disk_usage | awk '{print $2}')
    local disk_percent=$(echo $disk_usage | awk '{print $5}')
    echo -e "  System Disk:       ${CYAN}$disk_used / $disk_total ($disk_percent used)${NC}"
}

check_memory() {
    if command -v free &> /dev/null; then
        local mem_info=$(free -h | grep Mem)
        local mem_used=$(echo $mem_info | awk '{print $3}')
        local mem_total=$(echo $mem_info | awk '{print $2}')
        echo -e "  Memory:            ${CYAN}$mem_used / $mem_total${NC}"
    fi
}

get_domain() {
    if [ -f "$ENV_FILE" ]; then
        grep "^DOMAIN=" "$ENV_FILE" | cut -d= -f2
    else
        echo "Not configured"
    fi
}

check_url() {
    local url=$1
    local name=$2
    
    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
        if [ "$response" == "200" ] || [ "$response" == "301" ] || [ "$response" == "302" ]; then
            echo -e "  ${GREEN}✓${NC} $name: ${GREEN}$response OK${NC}"
        elif [ "$response" == "000" ]; then
            echo -e "  ${RED}✗${NC} $name: ${RED}Connection failed${NC}"
        else
            echo -e "  ${YELLOW}○${NC} $name: ${YELLOW}HTTP $response${NC}"
        fi
    fi
}

# Main
print_header

print_section "Docker Status"
check_docker

print_section "Container Status"
echo ""
printf "  ${BOLD}%-20s %-15s %-15s %-10s${NC}\n" "SERVICE" "STATUS" "HEALTH" "UPTIME"
echo -e "  ${BLUE}─────────────────────────────────────────────────────────────${NC}"

check_container_status "kirimchat-postgres" "PostgreSQL"
check_container_status "kirimchat-redis" "Redis"
check_container_status "kirimchat-backend" "Backend"
check_container_status "kirimchat-frontend" "Frontend"
check_container_status "kirimchat-caddy" "Caddy (SSL)"

print_section "Resource Usage"
check_memory
check_disk_usage

print_section "Network & Endpoints"
DOMAIN=$(get_domain)
echo -e "  Domain: ${CYAN}$DOMAIN${NC}"
echo ""

if [ "$DOMAIN" != "Not configured" ] && [ -n "$DOMAIN" ]; then
    check_url "https://$DOMAIN" "Frontend"
    check_url "https://$DOMAIN/api/v1/health" "Backend API"
else
    check_port 80 "HTTP"
    check_port 443 "HTTPS"
    check_port 3000 "Frontend"
    check_port 3005 "Backend"
fi

print_section "Quick Commands"
echo ""
echo -e "  ${YELLOW}View logs:${NC}        ./logs.sh"
echo -e "  ${YELLOW}View backend log:${NC} ./logs.sh backend"
echo -e "  ${YELLOW}Restart all:${NC}      docker compose -f docker/docker-compose.yml restart"
echo -e "  ${YELLOW}Create admin:${NC}     ./create-admin.sh"
echo -e "  ${YELLOW}Backup:${NC}           ./backup.sh"

echo ""
echo -e "${GREEN}Status check completed!${NC}"
