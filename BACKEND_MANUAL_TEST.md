# Simple Backend Test - Manual Steps

## Step 1: Verify Docker
```powershell
docker --version
docker ps
```

## Step 2: Build and Start Services
```powershell
cd D:\All_Projects\aureus-atlas-dataops

# Clean any existing containers
docker-compose -f docker-compose.backend.yml down -v

# Build and start (this will take 2-3 minutes)
docker-compose -f docker-compose.backend.yml up --build

# Leave this terminal running to see logs
# Open a NEW terminal for testing
```

## Step 3: Test in New Terminal
```powershell
# Check containers are running
docker ps

# Expected to see: aureus-api, aureus-postgres, aureus-redis, aureus-minio, aureus-worker

# Test health endpoint
curl http://localhost:8000/health

# Should return: {"status":"healthy","version":"1.0.0","environment":"development"}

# Test login
curl -X POST "http://localhost:8000/v1/auth/login" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin@aureus-platform.com&password=Admin123!"

# Should return JWT token and user info

# View API documentation
Start-Process "http://localhost:8000/docs"
```

## Step 4: Access Services
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Database**: localhost:5432 (aureus/dev_password_123)

## Troubleshooting

### If build fails:
```powershell
# Check Python availability
docker run --rm python:3.12-slim python --version

# Try building just the API
docker-compose -f docker-compose.backend.yml build api

# Check for errors in the output
```

### If containers won't start:
```powershell
# Check logs
docker-compose -f docker-compose.backend.yml logs api
docker-compose -f docker-compose.backend.yml logs postgres

# Check port conflicts
Get-NetTCPConnection -LocalPort 8000,5432,6379,9000 -State Listen
```

### If you need to start fresh:
```powershell
# Remove everything and start over
docker-compose -f docker-compose.backend.yml down -v
docker system prune -f
docker-compose -f docker-compose.backend.yml up --build
```

## Alternative: Run Without Docker

If Docker continues to have issues, you can run locally:

```powershell
# Install Python 3.12
# Install PostgreSQL 16

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
$env:DATABASE_URL = "postgresql://aureus:password@localhost:5432/aureus"
$env:REDIS_URL = "redis://localhost:6379/0"
$env:JWT_SECRET_KEY = "dev-secret-key"

# Run database migrations
alembic upgrade head

# Start API
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```
