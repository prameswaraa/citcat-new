# ============================================
# PM2 Production Start Script for KirimChat
# Windows PowerShell Version
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  KirimChat PM2 Production Deployment  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Navigate to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check if PM2 is installed
$pm2Exists = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Exists) {
    Write-Host "PM2 is not installed. Installing globally..." -ForegroundColor Red
    npm install -g pm2
}

# Check if pnpm is installed
$pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmExists) {
    Write-Host "pnpm is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

Write-Host "Prerequisites OK" -ForegroundColor Green

Write-Host "`n[2/5] Installing dependencies..." -ForegroundColor Yellow
pnpm install --frozen-lockfile

Write-Host "`n[3/5] Building applications..." -ForegroundColor Yellow
pnpm build

Write-Host "`n[4/5] Creating logs directory..." -ForegroundColor Yellow
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host "`n[5/5] Starting PM2 applications..." -ForegroundColor Yellow

# Stop existing processes if running
try {
    pm2 delete ecosystem.config.cjs 2>$null
} catch {
    # Ignore errors if no processes exist
}

# Start with production environment
pm2 start ecosystem.config.cjs --env production

# Save process list
pm2 save

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!                   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  pm2 status          - View process status"
Write-Host "  pm2 logs            - View all logs"
Write-Host "  pm2 monit           - Open monitoring dashboard"
Write-Host "  pm2 reload all      - Zero-downtime reload"
Write-Host ""
Write-Host "To enable auto-start on Windows boot:" -ForegroundColor Yellow
Write-Host "  pm2-startup install"
Write-Host "  pm2 save"
Write-Host ""
