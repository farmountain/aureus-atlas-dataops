# AUREUS Backend - Test Script
# Run this script to test the backend services

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "AUREUS Backend Test Script" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 2: Check Docker is running
Write-Host "`n[2/6] Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 3: Build and start services
Write-Host "`n[3/6] Starting backend services..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes on first run..." -ForegroundColor Gray

docker-compose -f docker-compose.backend.yml down -v 2>&1 | Out-Null
docker-compose -f docker-compose.backend.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 4: Wait for services to be healthy
Write-Host "`n[4/6] Waiting for services to be healthy..." -ForegroundColor Yellow
Write-Host "Waiting 30 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Step 5: Check container status
Write-Host "`n[5/6] Checking container status..." -ForegroundColor Yellow
$containers = docker-compose -f docker-compose.backend.yml ps --format json | ConvertFrom-Json

if ($containers) {
    Write-Host "✓ Containers running:" -ForegroundColor Green
    docker-compose -f docker-compose.backend.yml ps
} else {
    Write-Host "✗ No containers found" -ForegroundColor Red
    Write-Host "Check logs: docker-compose -f docker-compose.backend.yml logs"
    exit 1
}

# Step 6: Test API
Write-Host "`n[6/6] Testing API endpoints..." -ForegroundColor Yellow

# Test health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    Write-Host "✓ Health check passed:" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Gray
    Write-Host "  Version: $($health.version)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    Write-Host "Check API logs: docker-compose -f docker-compose.backend.yml logs api"
    exit 1
}

# Test login endpoint
Write-Host "`nTesting login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin@aureus-platform.com"
        password = "Admin123!"
    }
    
    $login = Invoke-RestMethod -Uri "http://localhost:8000/v1/auth/login" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $loginBody `
        -TimeoutSec 5
    
    Write-Host "✓ Login successful:" -ForegroundColor Green
    Write-Host "  User: $($login.user.email)" -ForegroundColor Gray
    Write-Host "  Role: $($login.user.role)" -ForegroundColor Gray
    Write-Host "  Token: $($login.access_token.Substring(0, 20))..." -ForegroundColor Gray
    
    # Save token for other tests
    $global:token = $login.access_token
    
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test datasets endpoint
Write-Host "`nTesting datasets endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $global:token"
    }
    
    $datasets = Invoke-RestMethod -Uri "http://localhost:8000/v1/datasets" `
        -Headers $headers `
        -TimeoutSec 5
    
    Write-Host "✓ Datasets endpoint working:" -ForegroundColor Green
    Write-Host "  Datasets found: $($datasets.datasets.Count)" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Datasets endpoint failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "Backend Test Complete!" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. View API docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  2. View MinIO console: http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
Write-Host "  3. Connect to PostgreSQL: localhost:5432 (aureus/dev_password_123)" -ForegroundColor White
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.backend.yml down" -ForegroundColor White
Write-Host ""
