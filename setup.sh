#!/bin/bash

# KirimChat Backend - One-Click Setup Script
# This script automates the entire deployment process

set -e

echo "🚀 KirimChat Backend - Automated Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo ""
    echo "Please create .env file first:"
    echo "  1. Copy .env.docker.example to .env"
    echo "  2. Update the values in .env"
    echo ""
    echo "Example:"
    echo "  cp .env.docker.example .env"
    echo "  nano .env"
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    echo "Please start Docker first."
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Stop and remove existing containers
echo "🛑 Stopping and removing existing containers..."
docker compose down 2>/dev/null || true

# Remove any orphaned containers with same names
echo "🧹 Cleaning up orphaned containers..."
docker rm -f kirimchat-backend kirimchat-postgres kirimchat-redis 2>/dev/null || true
echo ""

# Pull latest images
echo "📦 Pulling latest images..."
docker compose pull
echo ""

# Make init-db.sh executable
echo "🔧 Setting up initialization scripts..."
chmod +x init-db.sh
echo ""

# Start services
echo "🚀 Starting services..."
docker compose up -d postgres redis
echo ""

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if postgres is healthy
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ Still waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

# Start backend (will auto-run migrations)
echo "🚀 Starting backend service..."
docker compose up -d backend
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 15

# Check backend health
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -f http://localhost:3005/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend health check timeout. Checking logs...${NC}"
        docker compose logs --tail=50 backend
        exit 1
    fi
    echo "⏳ Attempt $i/30..."
    sleep 2
done

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo "======================================"
echo ""
echo "📊 Service Status:"
docker compose ps
echo ""
echo "🌐 Backend API: http://localhost:3005"
echo "🗄️  PostgreSQL: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  View backend:     docker compose logs -f backend"
echo "  Stop services:    docker compose down"
echo "  Restart:          docker compose restart"
echo ""
echo -e "${GREEN}✅ Your KirimChat backend is now running!${NC}"