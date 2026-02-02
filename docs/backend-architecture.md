# AUREUS Backend Architecture

**Version**: 1.0  
**Date**: January 31, 2026  
**Status**: Design Phase  
**Target**: Production MVP (Weeks 2-4)

---

## Executive Summary

This document defines the backend architecture for AUREUS Atlas DataOps platform. The backend will replace the current browser-only implementation with a production-grade distributed system capable of supporting enterprise banking customers.

**Key Design Principles:**
- **Security First**: Defense-in-depth, least privilege, zero trust
- **Evidence-Driven**: Every action creates immutable audit trail
- **Scalability**: Horizontal scaling to support 1000+ users
- **Compliance**: SOC 2, GDPR, PCI DSS ready
- **Simplicity**: Monolith first, microservices later

**Timeline:**
- **Week 2**: Core API + Authentication (5 endpoints)
- **Week 3**: Query execution + Evidence storage (3 endpoints)
- **Week 4**: Integration + Testing (E2E flows)

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Design](#3-component-design)
4. [Data Architecture](#4-data-architecture)
5. [API Specification](#5-api-specification)
6. [Security Architecture](#6-security-architecture)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Operational Concerns](#8-operational-concerns)
9. [Migration Strategy](#9-migration-strategy)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. System Context

### 1.1 Current State (Frontend-Only)

```
┌─────────────────────────────────────────────┐
│         Browser (React + TypeScript)        │
│                                             │
│  ┌─────────────┐      ┌──────────────┐    │
│  │ Query       │      │ Config       │    │
│  │ Service     │      │ Copilot      │    │
│  └──────┬──────┘      └──────┬───────┘    │
│         │                    │             │
│  ┌──────▼────────────────────▼────────┐   │
│  │     Spark Runtime (spark.llm)      │   │
│  └──────┬─────────────────────────────┘   │
│         │                                  │
│  ┌──────▼──────────┐     ┌─────────────┐ │
│  │  useKV Storage  │     │  OpenAI API │ │
│  │  (localStorage) │     │  (External) │ │
│  └─────────────────┘     └─────────────┘ │
└─────────────────────────────────────────────┘

Limitations:
- ❌ Data lost on browser clear
- ❌ No multi-user support
- ❌ Secrets in browser
- ❌ No SQL execution
- ❌ Limited audit trail
```

### 1.2 Target State (Full Stack)

```
┌──────────────────────────────────────────────────────────┐
│                    Banking Customer                       │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ HTTPS/WSS
                        │
┌───────────────────────▼──────────────────────────────────┐
│                  Load Balancer (ALB)                      │
│             TLS Termination + WAF + DDoS                  │
└───────────┬──────────────────────────────────────────────┘
            │
    ┌───────▼────────┐
    │   CloudFront   │ (Static Assets)
    └───────┬────────┘
            │
┌───────────▼──────────────────────────────────────────────┐
│              Application Layer (ECS/Fargate)              │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend   │  │   API Server │  │   Worker     │  │
│  │   (React)    │◄─┤   (FastAPI)  │◄─┤   (Celery)   │  │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘  │
│                            │                  │           │
└────────────────────────────┼──────────────────┼───────────┘
                             │                  │
        ┌────────────────────┼──────────────────┼──────────┐
        │                    │                  │          │
        │                    │                  │          │
  ┌─────▼──────┐   ┌────────▼─────┐   ┌───────▼──────┐  │
  │ PostgreSQL │   │    Redis     │   │    S3/MinIO  │  │
  │  (RDS)     │   │  (ElastiCache)│   │  (Evidence)  │  │
  │            │   │               │   │              │  │
  │ • Metadata │   │ • Sessions    │   │ • Audit Logs │  │
  │ • Audit    │   │ • Rate Limit  │   │ • Snapshots  │  │
  │ • Users    │   │ • Task Queue  │   │ • Exports    │  │
  └────────────┘   └───────────────┘   └──────────────┘  │
                                                           │
└──────────────────────────────────────────────────────────┘
                   Data Layer
```

### 1.3 Integration Points

| System | Direction | Purpose | Protocol |
|--------|-----------|---------|----------|
| **OpenAI / Azure OpenAI** | Outbound | LLM API calls | HTTPS/REST |
| **Customer Database** | Outbound | Query execution | PostgreSQL wire protocol |
| **Auth0 / Okta** | Inbound | SSO authentication | OIDC/SAML 2.0 |
| **Slack / Teams** | Outbound | Notifications | Webhook/Bot API |
| **S3 / Azure Blob** | Outbound | Evidence storage | SDK |
| **DataDog / New Relic** | Outbound | Observability | Agent |

---

## 2. Architecture Overview

### 2.1 Architectural Style

**Modular Monolith** (Phase 1)
- Single deployable FastAPI application
- Clear module boundaries (future microservices)
- Shared database with schema separation
- Simple deployment and operations

**Future Evolution** (Phase 2+):
- Extract high-traffic modules (Query Service)
- Separate compute-intensive tasks (LLM calls)
- Independent scaling per service

### 2.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | React 19 + TypeScript | Existing codebase, modern, type-safe |
| **API Server** | FastAPI (Python 3.12) | Async support, OpenAPI docs, Python ML ecosystem |
| **Task Queue** | Celery + Redis | Proven, scalable, Python native |
| **Database** | PostgreSQL 16 | JSONB support, full-text search, reliability |
| **Cache** | Redis 7 | Session storage, rate limiting, task queue |
| **Storage** | S3 / MinIO | Evidence immutability, compliance, cost-effective |
| **Authentication** | Auth0 / Okta | Enterprise SSO, MFA, compliance |
| **Observability** | DataDog | Unified logs, metrics, traces, APM |
| **Container** | Docker + ECS Fargate | Serverless containers, AWS native |
| **IaC** | Terraform | Multi-cloud, GitOps-friendly, state management |

### 2.3 Deployment Model

**Development:**
```
docker-compose.yml
├── api (FastAPI)
├── worker (Celery)
├── postgres
├── redis
├── minio (S3 compatible)
└── mailhog (email testing)
```

**Production:**
```
AWS ECS Fargate
├── API Service (2+ tasks)
├── Worker Service (1+ tasks)
├── RDS PostgreSQL (Multi-AZ)
├── ElastiCache Redis (Multi-AZ)
└── S3 (versioned, encrypted)
```

---

## 3. Component Design

### 3.1 API Server (FastAPI)

**Responsibilities:**
- HTTP request handling
- Authentication/authorization
- Input validation
- Business logic orchestration
- Response formatting

**Module Structure:**
```
src/backend/
├── main.py                   # FastAPI app initialization
├── config.py                 # Configuration management
├── dependencies.py           # FastAPI dependency injection
│
├── api/                      # API routes
│   ├── __init__.py
│   ├── auth.py               # POST /auth/login, /auth/logout
│   ├── query.py              # POST /query/ask, GET /query/history
│   ├── dataset.py            # GET /datasets, POST /datasets
│   ├── approval.py           # POST /approval/submit, GET /approval/pending
│   ├── audit.py              # GET /audit/trail, GET /audit/evidence/{id}
│   └── admin.py              # Admin endpoints (user management)
│
├── core/                     # Core business logic
│   ├── query_service.py      # Query orchestration
│   ├── llm_service.py        # LLM interaction
│   ├── guard_service.py      # Policy engine
│   ├── evidence_service.py   # Evidence generation
│   └── approval_service.py   # Approval workflow
│
├── models/                   # SQLAlchemy ORM models
│   ├── user.py
│   ├── dataset.py
│   ├── query.py
│   ├── approval.py
│   └── audit.py
│
├── schemas/                  # Pydantic schemas (validation)
│   ├── auth.py
│   ├── query.py
│   ├── dataset.py
│   └── audit.py
│
├── security/                 # Security modules
│   ├── auth.py               # JWT handling
│   ├── rbac.py               # Role-based access control
│   ├── prompt_defense.py     # Prompt injection defense
│   └── pii_masking.py        # PII masking
│
├── db/                       # Database
│   ├── session.py            # DB session management
│   ├── migrations/           # Alembic migrations
│   └── init.sql              # Initial schema
│
└── utils/                    # Utilities
    ├── logging.py            # Structured logging
    ├── metrics.py            # Metrics collection
    └── errors.py             # Error handling
```

**Key Patterns:**
- **Dependency Injection**: Database sessions, current user, services
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Exception Handlers**: Consistent error responses

### 3.2 Worker Service (Celery)

**Responsibilities:**
- Long-running tasks (LLM calls > 10 seconds)
- Scheduled jobs (budget resets, retention cleanup)
- Background processing (evidence generation)

**Task Types:**

| Task | Trigger | Priority | Timeout |
|------|---------|----------|---------|
| `execute_query` | User query | HIGH | 60s |
| `generate_evidence_pack` | Approval submission | MEDIUM | 30s |
| `cleanup_expired_data` | Cron (daily 2 AM) | LOW | 300s |
| `reset_monthly_budgets` | Cron (monthly 1st) | LOW | 60s |
| `send_notification` | Event-driven | HIGH | 10s |

**Task Structure:**
```python
# src/backend/tasks/query_tasks.py
from celery import Task
from .celery_app import celery_app

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    time_limit=60
)
def execute_query(
    self: Task,
    query_id: str,
    user_id: str,
    question: str
) -> dict:
    """Execute natural language query asynchronously."""
    try:
        # Business logic
        result = query_service.execute(question)
        return {"status": "success", "data": result}
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc)
```

### 3.3 Database (PostgreSQL)

**Schema Design:**

```sql
-- Core tables

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'approver', 'analyst', 'viewer'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- Column definitions
    data_location VARCHAR(500), -- Connection string (encrypted)
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    dataset_id UUID REFERENCES datasets(id),
    question TEXT NOT NULL, -- Original natural language query
    generated_sql TEXT, -- LLM-generated SQL
    result JSONB, -- Query results (encrypted if PII)
    evidence_url VARCHAR(500), -- S3 link to evidence pack
    status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'success', 'error'
    error_message TEXT,
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'pipeline_deploy', 'policy_change', etc.
    payload JSONB NOT NULL, -- Approval request details
    submitter_id UUID REFERENCES users(id) NOT NULL,
    approver_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    decision_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- 'query_executed', 'approval_submitted', etc.
    user_id UUID REFERENCES users(id) NOT NULL,
    resource_type VARCHAR(100), -- 'dataset', 'query', 'approval', etc.
    resource_id UUID,
    details JSONB NOT NULL, -- Event-specific data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);

-- Full-text search
CREATE INDEX idx_queries_question ON queries USING GIN (to_tsvector('english', question));
```

**Data Encryption:**
- **At Rest**: AWS RDS encryption with KMS
- **In Transit**: TLS 1.3 for all connections
- **Application-Level**: Sensitive fields encrypted with Fernet (PII in query results)

### 3.4 Object Storage (S3)

**Bucket Structure:**
```
aureus-evidence-prod/
├── audit-logs/
│   └── 2026/01/31/
│       └── {event_id}.json
├── evidence-packs/
│   └── {approval_id}/
│       ├── manifest.json
│       ├── snapshot.json
│       └── validation.json
├── query-results/
│   └── {query_id}/
│       └── results.parquet (encrypted)
└── exports/
    └── {user_id}/
        └── {export_id}.zip
```

**Retention Policies:**
- **Audit Logs**: 7 years (compliance), immutable, versioned
- **Evidence Packs**: 7 years (compliance), immutable, lifecycle to Glacier after 1 year
- **Query Results**: 90 days (configurable), encrypted
- **Exports**: 30 days, auto-delete

**Security:**
- Bucket encryption: AES-256 (SSE-S3)
- Versioning: Enabled (compliance)
- Public access: Blocked
- Access: IAM roles only (no access keys)

---

## 4. Data Architecture

### 4.1 Data Flow

**Query Execution Flow:**

```
1. User submits question via UI
        ↓
2. Frontend → POST /api/query/ask
        ↓
3. API validates JWT, extracts user context
        ↓
4. API validates input (prompt injection defense)
        ↓
5. API creates query record (status: 'pending')
        ↓
6. API enqueues Celery task: execute_query.delay(query_id)
        ↓
7. API returns 202 Accepted + query_id
        ↓
8. Worker picks up task from Redis queue
        ↓
9. Worker calls LLM to generate SQL
        ↓
10. Worker validates SQL (safety checks)
        ↓
11. Worker executes SQL on customer DB (read-only user)
        ↓
12. Worker applies PII masking (role-based)
        ↓
13. Worker encrypts results, stores in S3
        ↓
14. Worker generates evidence pack, stores in S3
        ↓
15. Worker creates audit event in PostgreSQL
        ↓
16. Worker updates query record (status: 'success')
        ↓
17. Frontend polls GET /api/query/{id} until complete
        ↓
18. Frontend displays results
```

### 4.2 Evidence Architecture

**Evidence Pack Structure:**
```json
{
  "evidence_id": "uuid",
  "query_id": "uuid",
  "user": {
    "id": "uuid",
    "email": "analyst@bank.com",
    "role": "analyst"
  },
  "timestamp": "2026-01-31T10:30:00Z",
  "snapshot": {
    "question": "Show me high-risk loans",
    "generated_sql": "SELECT...",
    "guard_policies_applied": ["pii_masking", "limit_enforcement"],
    "datasets_accessed": ["loan_portfolio"],
    "row_count": 42
  },
  "validation": {
    "prompt_injection_check": "passed",
    "sql_safety_check": "passed",
    "policy_compliance": "passed"
  },
  "signature": "SHA256:...",
  "immutable_storage_url": "s3://..."
}
```

**Evidence Storage Requirements:**
- ✅ **Immutable**: Cannot be modified after creation (S3 Object Lock)
- ✅ **Tamper-Evident**: SHA-256 signature verification
- ✅ **Auditable**: Who, what, when, why captured
- ✅ **Retention**: 7 years minimum (regulatory)
- ✅ **Retrievable**: Fast retrieval for audits (<5 seconds)

### 4.3 Caching Strategy

**Redis Cache Layers:**

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `session:{token}` | 1 hour | JWT session data |
| `user:{id}` | 15 minutes | User profile |
| `dataset:{id}:schema` | 1 hour | Dataset metadata |
| `query:{id}:result` | 5 minutes | Recent query results |
| `ratelimit:{user_id}:{endpoint}` | 60 seconds | Rate limit counters |
| `approval:{id}:status` | 1 minute | Approval status polling |

**Cache Invalidation:**
- **Write-Through**: Update cache on every write
- **TTL-Based**: Automatic expiration
- **Event-Driven**: Explicit invalidation on critical updates

---

## 5. API Specification

### 5.1 OpenAPI Overview

**Base URL**: `https://api.aureus-platform.com/v1`

**Authentication**: Bearer token (JWT) in `Authorization` header

**Rate Limits**:
- 10 requests/minute for `/query/ask`
- 60 requests/minute for other endpoints
- 429 Too Many Requests if exceeded

### 5.2 Core Endpoints

#### 5.2.1 Authentication

**POST /auth/login**
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "analyst@bank.com",
  "password": "SecurePassword123!"
}

Response 200 OK:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "analyst@bank.com",
    "role": "analyst"
  }
}
```

**POST /auth/refresh**
```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response 200 OK:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

#### 5.2.2 Query Execution

**POST /query/ask**
```http
POST /v1/query/ask
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "Show me all high-risk loans over $1M",
  "dataset_id": "uuid" // optional, auto-detect if omitted
}

Response 202 Accepted:
{
  "query_id": "uuid",
  "status": "pending",
  "message": "Query submitted for execution"
}
```

**GET /query/{query_id}**
```http
GET /v1/query/{query_id}
Authorization: Bearer <token>

Response 200 OK:
{
  "query_id": "uuid",
  "status": "success",
  "question": "Show me all high-risk loans over $1M",
  "generated_sql": "SELECT...",
  "results": [
    {"loan_id": "L-001", "amount": 1500000, "risk": "HIGH"},
    {"loan_id": "L-003", "amount": 2000000, "risk": "HIGH"}
  ],
  "row_count": 2,
  "execution_time_ms": 1250,
  "evidence_url": "https://evidence.aureus.com/pack/uuid",
  "created_at": "2026-01-31T10:30:00Z"
}

Response 200 OK (In Progress):
{
  "query_id": "uuid",
  "status": "running",
  "message": "Executing query...",
  "created_at": "2026-01-31T10:30:00Z"
}

Response 200 OK (Error):
{
  "query_id": "uuid",
  "status": "error",
  "error_message": "Query timeout after 60 seconds",
  "created_at": "2026-01-31T10:30:00Z"
}
```

#### 5.2.3 Datasets

**GET /datasets**
```http
GET /v1/datasets
Authorization: Bearer <token>

Response 200 OK:
{
  "datasets": [
    {
      "id": "uuid",
      "name": "loan_portfolio",
      "description": "All active and closed loans",
      "row_count": 125000,
      "last_updated": "2026-01-31T00:00:00Z",
      "schema": [
        {"name": "loan_id", "type": "VARCHAR", "pii": false},
        {"name": "customer_ssn", "type": "VARCHAR", "pii": true},
        {"name": "amount", "type": "NUMERIC", "pii": false}
      ]
    }
  ]
}
```

#### 5.2.4 Approvals

**POST /approval/submit**
```http
POST /v1/approval/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "pipeline_deploy",
  "payload": {
    "pipeline_id": "uuid",
    "change_summary": "Add fraud detection stage"
  },
  "reason": "New regulatory requirement"
}

Response 201 Created:
{
  "approval_id": "uuid",
  "status": "pending",
  "submitted_at": "2026-01-31T10:30:00Z"
}
```

**GET /approval/pending**
```http
GET /v1/approval/pending
Authorization: Bearer <token>

Response 200 OK:
{
  "approvals": [
    {
      "approval_id": "uuid",
      "type": "pipeline_deploy",
      "submitter": "analyst@bank.com",
      "submitted_at": "2026-01-31T10:30:00Z",
      "payload": {...}
    }
  ]
}
```

#### 5.2.5 Audit Trail

**GET /audit/trail**
```http
GET /v1/audit/trail?start_date=2026-01-01&end_date=2026-01-31&user_id=uuid
Authorization: Bearer <token>

Response 200 OK:
{
  "events": [
    {
      "event_id": "uuid",
      "event_type": "query_executed",
      "user_email": "analyst@bank.com",
      "timestamp": "2026-01-31T10:30:00Z",
      "details": {
        "question": "Show high-risk loans",
        "dataset": "loan_portfolio",
        "row_count": 42
      }
    }
  ],
  "total": 1234,
  "page": 1,
  "page_size": 50
}
```

**GET /audit/evidence/{evidence_id}**
```http
GET /v1/audit/evidence/{evidence_id}
Authorization: Bearer <token>

Response 200 OK:
{
  "evidence_id": "uuid",
  "query_id": "uuid",
  "timestamp": "2026-01-31T10:30:00Z",
  "snapshot": {...},
  "validation": {...},
  "signature": "SHA256:...",
  "download_url": "https://evidence.aureus.com/download/uuid?token=..."
}
```

### 5.3 Error Handling

**Standard Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "question",
        "issue": "Field is required"
      }
    ],
    "request_id": "uuid"
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_FAILED` | 401 | Invalid or expired token |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SQL_VALIDATION_FAILED` | 400 | Generated SQL is unsafe |
| `PROMPT_INJECTION_DETECTED` | 400 | Malicious input detected |

---

## 6. Security Architecture

### 6.1 Authentication Flow

**JWT-Based Authentication:**

```
1. User enters credentials
        ↓
2. Frontend → POST /auth/login
        ↓
3. Backend validates credentials (bcrypt hash check)
        ↓
4. Backend generates JWT (access + refresh tokens)
        ↓
5. JWT contains claims: {user_id, role, exp, iat, jti}
        ↓
6. Frontend stores tokens (httpOnly cookie for refresh, memory for access)
        ↓
7. Every API request includes: Authorization: Bearer <access_token>
        ↓
8. Backend validates JWT signature + expiration
        ↓
9. Backend extracts user context, checks permissions
        ↓
10. If expired, frontend uses refresh token → POST /auth/refresh
```

**Token Specifications:**
- **Access Token**: 1 hour TTL, short-lived
- **Refresh Token**: 7 days TTL, stored in httpOnly cookie
- **Algorithm**: HS256 (HMAC-SHA256)
- **Secret**: Rotated every 90 days
- **Revocation**: Redis blacklist for immediate revocation

### 6.2 Authorization (RBAC)

**Permission Matrix:**

| Resource | Viewer | Analyst | Approver | Admin |
|----------|--------|---------|----------|-------|
| **Query Execution** | ✅ (approved datasets only) | ✅ | ✅ | ✅ |
| **View Query Results** | ✅ (own) | ✅ (own) | ✅ (all) | ✅ (all) |
| **View PII** | ❌ (redacted) | ❌ (partial) | ✅ (partial) | ✅ (full) |
| **Submit Approval** | ❌ | ✅ | ✅ | ✅ |
| **Approve Request** | ❌ | ❌ | ✅ | ✅ |
| **Create Dataset** | ❌ | ❌ | ❌ | ✅ |
| **View Audit Trail** | ❌ (own) | ❌ (own) | ✅ (team) | ✅ (all) |
| **Manage Users** | ❌ | ❌ | ❌ | ✅ |

**Implementation:**
```python
# Decorator-based permission checks
@router.post("/query/ask")
@require_role(["analyst", "approver", "admin"])
async def ask_question(
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    # Check resource-level permissions
    dataset = await get_dataset(request.dataset_id)
    if not can_access_dataset(current_user, dataset):
        raise HTTPException(403, "Insufficient permissions")
    
    # Execute query...
```

### 6.3 Network Security

**Layers of Protection:**

1. **Perimeter (WAF):**
   - OWASP Top 10 protection
   - Rate limiting (10 req/min per IP for login)
   - Geo-blocking (configurable)
   - Bot detection

2. **Transport (TLS 1.3):**
   - Certificate pinning (mobile/desktop)
   - HSTS enabled (max-age=31536000)
   - Perfect forward secrecy (PFS)

3. **Application:**
   - Prompt injection defense
   - SQL injection protection
   - XSS prevention (CSP headers)
   - CSRF tokens

4. **Data:**
   - Encryption at rest (AES-256)
   - Field-level encryption for PII
   - Access logging

### 6.4 Secrets Management

**Secrets Storage:**
- **Development**: `.env` file (gitignored)
- **Production**: AWS Secrets Manager / Azure Key Vault

**Secret Types:**
```
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection string
- JWT_SECRET_KEY: Token signing key
- OPENAI_API_KEY: LLM API key
- S3_ACCESS_KEY_ID: Object storage credentials
- S3_SECRET_ACCESS_KEY: Object storage credentials
- ENCRYPTION_KEY: Fernet key for PII encryption
```

**Rotation Policy:**
- **JWT Secret**: Every 90 days (automated)
- **Database Password**: Every 180 days (manual)
- **API Keys**: On compromise or annually

---

## 7. Deployment Architecture

### 7.1 AWS Architecture (Production)

```
┌─────────────────────────────────────────────────────────────┐
│                         Route 53                            │
│                   (DNS: api.aureus.com)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      CloudFront                             │
│              (CDN + WAF + DDoS Protection)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────┐
│              Application Load Balancer                      │
│              (TLS Termination, Health Checks)               │
└────┬─────────────────────────────────────────────────┬─────┘
     │                                                  │
┌────▼──────────────────────┐       ┌──────────────────▼─────┐
│    ECS Fargate Cluster    │       │   ECS Fargate Cluster  │
│                           │       │                        │
│  ┌──────────────────┐    │       │  ┌──────────────────┐ │
│  │  API Task (x2)   │    │       │  │ Worker Task (x1) │ │
│  │  - FastAPI       │    │       │  │ - Celery         │ │
│  │  - 1 vCPU        │    │       │  │ - 2 vCPU         │ │
│  │  - 2 GB RAM      │    │       │  │ - 4 GB RAM       │ │
│  └──────────────────┘    │       │  └──────────────────┘ │
└───────────────────────────┘       └────────────────────────┘
         │                                    │
         │                                    │
    ┌────▼───────────┬─────────────────┬────▼─────┐
    │                │                 │          │
┌───▼──────┐  ┌──────▼──────┐  ┌──────▼────┐  ┌──▼──────┐
│ RDS      │  │ ElastiCache │  │    S3     │  │ Secrets │
│PostgreSQL│  │   Redis     │  │ (Evidence)│  │ Manager │
│Multi-AZ  │  │  Multi-AZ   │  │ Encrypted │  │         │
└──────────┘  └─────────────┘  └───────────┘  └─────────┘
```

**Resource Sizing (Initial):**

| Service | Instance Type | Count | vCPU | Memory | Cost/Month |
|---------|---------------|-------|------|--------|------------|
| API Tasks | Fargate | 2 | 1 | 2 GB | ~$30 |
| Worker Tasks | Fargate | 1 | 2 | 4 GB | ~$30 |
| RDS PostgreSQL | db.t3.medium | 1 (Multi-AZ) | 2 | 4 GB | ~$150 |
| ElastiCache Redis | cache.t3.small | 1 (Multi-AZ) | 2 | 1.5 GB | ~$50 |
| S3 | Standard | - | - | 100 GB | ~$3 |
| **Total** | | | | | **~$263/month** |

### 7.2 Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://aureus:dev@postgres:5432/aureus
      - REDIS_URL=redis://redis:6379/0
      - ENVIRONMENT=development
    volumes:
      - ./src/backend:/app
    depends_on:
      - postgres
      - redis
    command: uvicorn main:app --host 0.0.0.0 --reload

  worker:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://aureus:dev@postgres:5432/aureus
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    command: celery -A tasks.celery_app worker --loglevel=info

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=aureus
      - POSTGRES_PASSWORD=dev
      - POSTGRES_DB=aureus
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

**Quick Start:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api alembic upgrade head

# Stop all services
docker-compose down
```

### 7.3 Infrastructure as Code (Terraform)

```hcl
# terraform/main.tf (simplified)

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "aureus-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  enable_dns_hostnames = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "aureus-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
module "db" {
  source = "terraform-aws-modules/rds/aws"
  
  identifier = "aureus-postgres"
  engine     = "postgres"
  engine_version = "16.1"
  instance_class = "db.t3.medium"
  allocated_storage = 100
  
  multi_az = true
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name = aws_db_subnet_group.main.name
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "aureus-redis"
  engine               = "redis"
  node_type            = "cache.t3.small"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# S3 Bucket for Evidence
resource "aws_s3_bucket" "evidence" {
  bucket = "aureus-evidence-prod"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  lifecycle_rule {
    id      = "archive-old-evidence"
    enabled = true
    
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}
```

---

## 8. Operational Concerns

### 8.1 Logging

**Log Levels:**
- **DEBUG**: Development only, sensitive data redacted
- **INFO**: Normal operations (query executed, approval submitted)
- **WARNING**: Degraded performance, retry attempts
- **ERROR**: Failed operations, exceptions
- **CRITICAL**: System failures, security incidents

**Structured Logging (JSON):**
```json
{
  "timestamp": "2026-01-31T10:30:00.123Z",
  "level": "INFO",
  "service": "api",
  "module": "query_service",
  "message": "Query executed successfully",
  "context": {
    "query_id": "uuid",
    "user_id": "uuid",
    "execution_time_ms": 1250,
    "row_count": 42
  },
  "trace_id": "abc123",
  "span_id": "def456"
}
```

**Log Aggregation:**
- **Tool**: DataDog / CloudWatch Logs
- **Retention**: 90 days (operational), 7 years (audit logs)
- **Search**: Full-text search on all fields
- **Alerts**: Automated alerts on ERROR/CRITICAL logs

### 8.2 Metrics

**Key Metrics:**

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `api.request.latency` | Histogram | P95 > 2s |
| `api.request.count` | Counter | - |
| `api.request.errors` | Counter | Error rate > 5% |
| `query.execution.time` | Histogram | P95 > 30s |
| `llm.response.time` | Histogram | P95 > 10s |
| `db.connection.pool` | Gauge | Utilization > 80% |
| `celery.task.queue.length` | Gauge | Length > 100 |
| `celery.task.failure.rate` | Gauge | Rate > 10% |

**Dashboards:**
- **Executive**: SLA compliance, user adoption, budget consumption
- **Engineering**: API latency, error rates, task queue length
- **Security**: Failed auth attempts, policy violations, audit coverage

### 8.3 Alerting

**Alert Rules:**

| Alert | Condition | Severity | Notification |
|-------|-----------|----------|--------------|
| API Down | Health check fails 3x | CRITICAL | PagerDuty + Slack |
| High Error Rate | Error rate > 5% for 5 min | HIGH | Slack |
| Slow Queries | P95 latency > 30s | MEDIUM | Email |
| DB Connection Pool Full | Utilization > 90% | HIGH | PagerDuty |
| Security Incident | Repeated auth failures | CRITICAL | Security team + email |

### 8.4 Backup and Recovery

**Database Backups:**
- **Frequency**: Automated daily snapshots (RDS)
- **Retention**: 30 days
- **Testing**: Monthly restore test to staging
- **RTO**: 4 hours (restore from snapshot)
- **RPO**: 1 hour (transaction logs)

**Application State:**
- **Redis**: Not backed up (ephemeral cache)
- **S3**: Versioning enabled (immutable evidence)

**Disaster Recovery Plan:**
1. Detect outage (automated monitoring)
2. Assess impact (RTO/RPO requirements)
3. Declare disaster if needed
4. Failover to backup region (manual or automated)
5. Restore from latest backup
6. Verify data integrity
7. Resume operations
8. Post-mortem within 1 week

---

## 9. Migration Strategy

### 9.1 Frontend → Backend Migration

**Phase 1: Dual-Mode Operation (Week 2)**
- Frontend keeps local logic as fallback
- New API calls added in parallel
- Feature flag controls which path

```typescript
// src/lib/query-service.ts
export async function ask(question: string) {
  if (USE_BACKEND_API) {
    // New path: Call backend API
    const response = await fetch('/api/query/ask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    });
    return await response.json();
  } else {
    // Old path: Use local LLM service
    return await executeQueryLocally(question);
  }
}
```

**Phase 2: Backend-First (Week 3)**
- Backend API becomes primary
- Local logic only as fallback
- Monitor error rates closely

**Phase 3: Backend-Only (Week 4)**
- Remove local logic
- All features backend-powered
- Significant code deletion

### 9.2 Data Migration

**Challenge**: No existing data to migrate (browser-only storage)

**Approach**: Fresh start
- Users re-authenticate via SSO
- No historical queries preserved (acceptable for pilot)
- Evidence generation starts fresh

### 9.3 Rollback Plan

**If Backend Fails:**
1. Toggle feature flag: `USE_BACKEND_API = false`
2. Frontend reverts to local execution
3. No data loss (frontend state preserved)
4. Fix backend issue offline
5. Re-enable when stable

**Requirements for Rollback:**
- Feature flags baked into frontend
- Local execution code preserved until Phase 3
- Clear rollback runbook

---

## 10. Implementation Roadmap

### 10.1 Week 2: Foundation

**Goals**: Core API + Authentication working

**Tasks:**
1. **Setup (Day 1)**
   - [ ] Initialize FastAPI project structure
   - [ ] Setup Docker Compose for local dev
   - [ ] Create PostgreSQL schema (Alembic migrations)
   - [ ] Setup Redis connection

2. **Authentication (Days 2-3)**
   - [ ] Implement JWT generation/validation
   - [ ] Create user model + CRUD operations
   - [ ] Build `/auth/login` endpoint
   - [ ] Build `/auth/refresh` endpoint
   - [ ] Add RBAC decorators

3. **Core Endpoints (Days 4-5)**
   - [ ] Build `/datasets` endpoint (list datasets)
   - [ ] Build `/audit/trail` endpoint (fetch audit logs)
   - [ ] Add health check endpoint `/health`
   - [ ] Setup structured logging
   - [ ] Add request ID middleware

**Deliverables:**
- ✅ Local development environment running
- ✅ Users can authenticate and get JWT
- ✅ Basic endpoints returning mock data
- ✅ Logs visible in console

### 10.2 Week 3: Query Execution

**Goals**: End-to-end query execution working

**Tasks:**
1. **Query Service (Days 1-2)**
   - [ ] Port prompt injection defense to Python
   - [ ] Port PII masking to Python
   - [ ] Build `/query/ask` endpoint (creates query record, enqueues task)
   - [ ] Build `/query/{id}` endpoint (poll status)

2. **Worker Implementation (Days 3-4)**
   - [ ] Setup Celery worker
   - [ ] Implement `execute_query` task
   - [ ] LLM integration (OpenAI API)
   - [ ] SQL validation logic
   - [ ] Mock SQL execution (PostgreSQL sandbox)

3. **Evidence Generation (Day 5)**
   - [ ] Build evidence pack structure
   - [ ] Store evidence in MinIO (S3-compatible)
   - [ ] Create audit event records
   - [ ] Build `/audit/evidence/{id}` endpoint

**Deliverables:**
- ✅ Users can ask natural language questions
- ✅ Backend generates SQL and executes
- ✅ Results displayed in frontend
- ✅ Evidence packs created and stored

### 10.3 Week 4: Integration + Testing

**Goals**: Production-ready system

**Tasks:**
1. **Frontend Integration (Days 1-2)**
   - [ ] Replace frontend LLM calls with API calls
   - [ ] Update state management (remove useKV)
   - [ ] Add loading states and error handling
   - [ ] Test all user flows end-to-end

2. **Security Hardening (Day 3)**
   - [ ] Add rate limiting middleware
   - [ ] Setup WAF rules (development)
   - [ ] Add input size limits
   - [ ] Security audit of all endpoints

3. **Observability (Day 4)**
   - [ ] Setup DataDog integration
   - [ ] Create dashboards (API metrics)
   - [ ] Configure alerts (error rate, latency)
   - [ ] Add distributed tracing

4. **Testing + Documentation (Day 5)**
   - [ ] Write integration tests (pytest)
   - [ ] Load testing (Locust)
   - [ ] Update README with backend setup
   - [ ] Create API documentation (Swagger UI)

**Deliverables:**
- ✅ Full stack working end-to-end
- ✅ Security controls validated
- ✅ Monitoring/alerting in place
- ✅ Ready for pilot deployment

### 10.4 Success Criteria

**Technical:**
- [ ] All 8 core API endpoints implemented and tested
- [ ] Query execution P95 latency < 30 seconds
- [ ] API error rate < 1%
- [ ] 90%+ unit test coverage
- [ ] Security scan passes (no HIGH/CRITICAL vulnerabilities)

**Operational:**
- [ ] Docker Compose runs with single command
- [ ] Logs structured and searchable
- [ ] Metrics visible in dashboard
- [ ] Alerts configured and tested

**User Experience:**
- [ ] No breaking changes for existing frontend users
- [ ] Query results identical to frontend-only version
- [ ] Evidence packs downloadable from UI

---

## Appendix

### A. Technology Decision Log

**Why FastAPI over Django?**
- Async support (critical for LLM calls)
- OpenAPI documentation auto-generation
- Modern Python 3.12 features
- Lighter weight, faster startup

**Why PostgreSQL over MongoDB?**
- ACID transactions (evidence integrity)
- JSONB for flexibility
- Strong SQL support (query execution)
- Regulatory compliance familiarity

**Why Celery over RabbitMQ?**
- Python-native
- Simpler setup
- Redis as backend (multi-purpose)

**Why ECS Fargate over EKS?**
- Serverless (no EC2 management)
- Simpler for small scale
- Cost-effective for pilot
- Can migrate to EKS later if needed

### B. Open Questions

1. **Customer Database Connection**: How do we securely connect to customer's PostgreSQL? VPN? PrivateLink?
2. **LLM Provider**: OpenAI vs. Azure OpenAI vs. Self-hosted? Customer preference?
3. **Deployment Region**: AWS us-east-1 default, or customer-specific region?
4. **SSO Integration**: Which IdP do target customers use? Okta? Azure AD? Custom SAML?

### C. References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [PostgreSQL 16 Release Notes](https://www.postgresql.org/docs/16/release-16.html)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

**Document Control:**
- **Version**: 1.0
- **Last Updated**: January 31, 2026
- **Next Review**: Weekly during implementation
- **Owner**: Engineering Team
- **Approvers**: CTO, Product Manager

*This architecture is subject to change based on pilot feedback and technical discoveries during implementation.*
