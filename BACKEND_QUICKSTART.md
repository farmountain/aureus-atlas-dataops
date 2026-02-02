# AUREUS Backend - Quick Start Guide

## Prerequisites

- Python 3.12+
- Docker Desktop
- Git

## Step 1: Start Backend Services

```powershell
# Start all backend services (postgres, redis, minio, api, worker)
docker-compose -f docker-compose.backend.yml up -d

# Check services are running
docker-compose -f docker-compose.backend.yml ps

# View logs
docker-compose -f docker-compose.backend.yml logs -f
```

## Step 2: Test API

Open browser: http://localhost:8000/docs

### Test Login

```powershell
# Login with default admin user
curl -X POST "http://localhost:8000/v1/auth/login" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin@aureus-platform.com&password=Admin123!"
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "...",
    "email": "admin@aureus-platform.com",
    "role": "admin"
  }
}
```

### Test Query Endpoint

```powershell
# Copy the access_token from login response
$token = "your-access-token-here"

# Submit a query
curl -X POST "http://localhost:8000/v1/query/ask" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"question":"Show me high-risk loans"}'
```

### Test Datasets Endpoint

```powershell
curl -X GET "http://localhost:8000/v1/datasets" `
  -H "Authorization: Bearer $token"
```

## Step 3: Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Docs** | http://localhost:8000/docs | N/A |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **PostgreSQL** | localhost:5432 | aureus / dev_password_123 |
| **Redis** | localhost:6379 | No password |

## Step 4: Stop Services

```powershell
# Stop all services
docker-compose -f docker-compose.backend.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.backend.yml down -v
```

## Troubleshooting

### Port Already in Use

```powershell
# Check what's using port 8000
Get-NetTCPConnection -LocalPort 8000 -State Listen

# Change port in docker-compose.backend.yml:
#   ports:
#     - "8001:8000"  # Changed from 8000:8000
```

### Database Connection Failed

```powershell
# Check postgres container
docker-compose -f docker-compose.backend.yml logs postgres

# Restart postgres
docker-compose -f docker-compose.backend.yml restart postgres
```

### API Won't Start

```powershell
# Check API logs
docker-compose -f docker-compose.backend.yml logs api

# Common issues:
# 1. Python dependencies missing -> rebuild: docker-compose -f docker-compose.backend.yml build
# 2. Database not ready -> wait 30 seconds and check again
```

## Next Steps

1. ✅ Backend foundation working
2. ⏳ Implement query execution service (Week 3)
3. ⏳ Add Celery worker tasks
4. ⏳ Integrate with frontend

See [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md) for detailed implementation plan.
