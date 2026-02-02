# AUREUS Backend - FastAPI Project Setup

**Version**: 1.0  
**Date**: February 1, 2026  
**Status**: Week 2 Implementation

---

## Quick Start

```bash
# Navigate to project root
cd d:\All_Projects\aureus-atlas-dataops

# Start backend services
docker-compose -f docker-compose.backend.yml up -d

# Check services are running
docker-compose -f docker-compose.backend.yml ps

# View API documentation
# Open browser: http://localhost:8001/docs

# View logs
docker-compose -f docker-compose.backend.yml logs -f api

# Stop services
docker-compose -f docker-compose.backend.yml down
```

---

## Project Structure

```
d:\All_Projects\aureus-atlas-dataops\
├── src/
│   ├── frontend/                 # Existing React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── lib/
│   │
│   └── backend/                  # NEW: FastAPI backend
│       ├── main.py               # FastAPI app entry point
│       ├── config.py             # Configuration management
│       ├── dependencies.py       # FastAPI dependency injection
│       │
│       ├── api/                  # API routes
│       │   ├── __init__.py
│       │   ├── auth.py           # Authentication endpoints
│       │   ├── query.py          # Query execution endpoints
│       │   ├── dataset.py        # Dataset management
│       │   ├── approval.py       # Approval workflow
│       │   └── audit.py          # Audit trail
│       │
│       ├── core/                 # Business logic
│       │   ├── __init__.py
│       │   ├── query_service.py  # Query orchestration
│       │   ├── llm_service.py    # LLM integration
│       │   ├── guard_service.py  # Policy engine
│       │   └── evidence_service.py
│       │
│       ├── models/               # SQLAlchemy ORM models
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── dataset.py
│       │   ├── query.py
│       │   └── audit.py
│       │
│       ├── schemas/              # Pydantic schemas
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── query.py
│       │   └── common.py
│       │
│       ├── security/             # Security modules
│       │   ├── __init__.py
│       │   ├── auth.py           # JWT handling
│       │   ├── rbac.py           # RBAC
│       │   ├── prompt_defense.py
│       │   └── pii_masking.py
│       │
│       ├── db/                   # Database
│       │   ├── __init__.py
│       │   ├── session.py        # DB session
│       │   ├── base.py           # Base model
│       │   └── migrations/       # Alembic
│       │       └── versions/
│       │
│       ├── tasks/                # Celery tasks
│       │   ├── __init__.py
│       │   ├── celery_app.py
│       │   └── query_tasks.py
│       │
│       └── utils/                # Utilities
│           ├── __init__.py
│           ├── logging.py
│           └── errors.py
│
├── docker-compose.backend.yml    # Backend services
├── Dockerfile.backend            # Backend container
├── requirements.txt              # Python dependencies
└── alembic.ini                   # Database migrations
```

---

## Implementation Plan: Week 2

### Day 1-2: Project Foundation

#### Task 1: Initialize Backend Structure
- [ ] Create `src/backend/` directory
- [ ] Setup `requirements.txt` with core dependencies
- [ ] Create `Dockerfile.backend`
- [ ] Create `docker-compose.backend.yml`
- [ ] Initialize `main.py` with FastAPI app

#### Task 2: Database Setup
- [ ] Install Alembic for migrations
- [ ] Create initial database schema
- [ ] Setup SQLAlchemy models
- [ ] Create first migration (users table)

---

### Day 3-4: Authentication

#### Task 3: JWT Authentication
- [ ] Implement JWT token generation
- [ ] Implement JWT token validation
- [ ] Create `/auth/login` endpoint
- [ ] Create `/auth/refresh` endpoint
- [ ] Add middleware for authentication

#### Task 4: User Management
- [ ] Create User model
- [ ] Implement password hashing (bcrypt)
- [ ] Add RBAC decorator
- [ ] Seed initial admin user

---

### Day 5: Core Endpoints

#### Task 5: Basic Endpoints
- [ ] Create `/health` endpoint
- [ ] Create `/datasets` endpoint (mock data)
- [ ] Create `/audit/trail` endpoint (mock data)
- [ ] Add request ID middleware
- [ ] Setup structured logging

---

## Docker Compose Configuration

See `docker-compose.backend.yml` for services:
- **api**: FastAPI application (port 8000)
- **worker**: Celery worker for async tasks
- **postgres**: PostgreSQL 16 database
- **redis**: Redis for caching and task queue
- **minio**: S3-compatible object storage

---

## Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://aureus:dev_password_123@postgres:5432/aureus

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# LLM
OPENAI_API_KEY=your-openai-api-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4

# S3/MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=aureus-evidence

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Next Steps

After Week 2 foundation is complete, proceed to Week 3:
- Query execution service
- Celery worker implementation
- Evidence generation
- Frontend integration

See [docs/backend-architecture.md](./backend-architecture.md) for full architecture details.
