# Environment & Secrets Setup

This document enumerates required environment variables for the MyCirvia stack and explains their purpose. Variables are grouped by environment (local, staging, production) and by subsystem. If a subsystem is not part of the current architecture, it is listed under **Open Questions**.

> Scope: Flutter (mobile), Next.js (web + admin), NestJS (API), PostgreSQL (Prisma), Redis (realtime + BullMQ), AWS S3 (storage), FCM (push), analytics, and security.

---

## 1) Local Environment Variables

### 1.1 Backend (NestJS API)
- `NODE_ENV` — Runtime environment (e.g., `development`).
- `APP_BASE_URL` — Public base URL for API (used in email templates, redirects).
- `API_PORT` — Port the NestJS server binds to locally.
- `JWT_ACCESS_SECRET` — Secret for signing access tokens.
- `JWT_REFRESH_SECRET` — Secret for signing refresh tokens.
- `JWT_ACCESS_TTL` — Access token lifespan (e.g., `15m`).
- `JWT_REFRESH_TTL` — Refresh token lifespan (e.g., `30d`).
- `ARGON2_MEMORY_COST` — Argon2 memory cost parameter.
- `ARGON2_TIME_COST` — Argon2 time cost parameter.
- `ARGON2_PARALLELISM` — Argon2 parallelism parameter.

### 1.2 Database (PostgreSQL + Prisma)
- `DATABASE_URL` — Primary PostgreSQL connection string used by Prisma.
- `DATABASE_DIRECT_URL` — Direct connection string (admin/migrations) if separate from pooled URL.

### 1.3 Redis (Realtime + BullMQ)
- `REDIS_URL` — Redis connection string for pub/sub and queues.
- `REDIS_TLS` — Whether to use TLS for Redis connections (`true`/`false`).

### 1.4 Realtime (WebSockets)
- `WS_PORT` — Port for WebSocket server (if separate from API port).
- `WS_ALLOWED_ORIGINS` — Comma-separated list of allowed origins for WS connections.

### 1.5 Storage (AWS S3)
- `S3_REGION` — AWS region for the S3 bucket.
- `S3_BUCKET` — S3 bucket name for uploads.
- `S3_ACCESS_KEY_ID` — AWS access key ID for S3 access.
- `S3_SECRET_ACCESS_KEY` — AWS secret access key for S3 access.
- `S3_SIGNED_URL_TTL` — TTL for signed URLs (e.g., `15m`).

### 1.6 Notifications (Firebase Cloud Messaging)
- `FCM_PROJECT_ID` — Firebase project ID.
- `FCM_CLIENT_EMAIL` — Service account client email.
- `FCM_PRIVATE_KEY` — Service account private key (store with escaped newlines).
- `FCM_SENDER_ID` — FCM sender ID for push.

### 1.7 Email (Transactional)
- `EMAIL_PROVIDER` — Provider name (e.g., `ses`, `sendgrid`).
- `EMAIL_FROM_ADDRESS` — Default “from” address.
- `EMAIL_FROM_NAME` — Default “from” name.
- `EMAIL_API_KEY` — API key/token for provider.

### 1.8 Rate Limiting & Abuse Controls
- `RATE_LIMIT_WINDOW_MS` — Time window for rate limiting.
- `RATE_LIMIT_MAX` — Max requests per window.

### 1.9 Observability
- `LOG_LEVEL` — Logging verbosity (e.g., `debug`, `info`).
- `SENTRY_DSN` — Error tracking DSN (optional in local).

### 1.10 Analytics (Privacy-Friendly)
- `ANALYTICS_PROVIDER` — Selected privacy-focused analytics (e.g., `plausible`).
- `ANALYTICS_SITE_ID` — Site ID or equivalent for analytics.

---

## 2) Staging Environment Variables

Staging uses the same variable names as local, with secure production-like values. Differences include:

- `NODE_ENV=staging`
- `APP_BASE_URL` points to staging API domain.
- `DATABASE_URL` points to staging Postgres instance.
- `REDIS_URL` points to staging Redis instance.
- `S3_BUCKET` points to staging bucket.
- `SENTRY_DSN` typically enabled.
- `RATE_LIMIT_MAX` set closer to production settings.

Add staging-specific domain allowlists:
- `WS_ALLOWED_ORIGINS` includes staging web domains.
- `CORS_ALLOWED_ORIGINS` includes staging web domains.

---

## 3) Production Environment Variables

Production uses the same variable names as local, with hardened values:

- `NODE_ENV=production`
- `APP_BASE_URL` points to production API domain.
- `DATABASE_URL` points to production Postgres (with TLS required).
- `REDIS_URL` points to production Redis (with TLS required).
- `S3_BUCKET` points to production bucket.
- `SENTRY_DSN` enabled with correct project.
- `RATE_LIMIT_MAX` finalized for prod.

Add production-only domains:
- `WS_ALLOWED_ORIGINS` includes production web domains.
- `CORS_ALLOWED_ORIGINS` includes production web domains.

---

## 4) Web (Next.js Public + Admin)

These variables are required for the Next.js web and admin apps:

- `NEXT_PUBLIC_API_BASE_URL` — Base URL for the API.
- `NEXT_PUBLIC_WS_URL` — WebSocket endpoint for realtime.
- `NEXT_PUBLIC_ANALYTICS_SITE_ID` — Client-side analytics site ID (privacy-safe).
- `NEXT_PUBLIC_SENTRY_DSN` — Client-side error tracking DSN (if used).
- `ADMIN_BASE_URL` — Admin app base URL (server-side use).
- `CORS_ALLOWED_ORIGINS` — Allowed origins for API requests.

---

## 5) Mobile (Flutter)

These variables are required in Flutter build configs or runtime config:

- `API_BASE_URL` — Base URL for API.
- `WS_BASE_URL` — WebSocket endpoint.
- `FCM_SENDER_ID` — FCM sender ID used by mobile app.
- `SENTRY_DSN` — Mobile error tracking DSN (if used).

---

## 6) Security & Compliance

- `ENCRYPTION_KEY` — Server-side symmetric key for sensitive fields (if used beyond DB encryption).
- `BACKUP_ENCRYPTION_KEY` — Key for encrypted backups.
- `ADMIN_AUDIT_LOG_RETENTION_DAYS` — Retention period for admin audit logs.
- `DATA_EXPORT_RETENTION_DAYS` — Retention for user export files.

---

## 7) Supabase (Auth, Database, Storage, Realtime)

The current architecture specifies PostgreSQL + AWS S3 + Redis/WebSockets. If Supabase is adopted, these variables are required:

- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_ANON_KEY` — Public anon key for client access.
- `SUPABASE_SERVICE_ROLE_KEY` — Secret key for server-side admin access.
- `SUPABASE_JWT_SECRET` — JWT signing secret (if custom auth rules are used).
- `SUPABASE_DB_URL` — Supabase Postgres connection URL (server-side).
- `SUPABASE_STORAGE_BUCKET` — Storage bucket name.
- `SUPABASE_REALTIME_URL` — Realtime endpoint URL.

---

## 8) Example `.env.example`

```dotenv
# Core
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
API_PORT=3000
WS_PORT=3001
LOG_LEVEL=debug

# Auth
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=2

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mycirvia
DATABASE_DIRECT_URL=postgresql://user:pass@localhost:5432/mycirvia

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=false

# Realtime
WS_ALLOWED_ORIGINS=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Storage (AWS S3)
S3_REGION=us-east-1
S3_BUCKET=mycirvia-local
S3_ACCESS_KEY_ID=change-me
S3_SECRET_ACCESS_KEY=change-me
S3_SIGNED_URL_TTL=15m

# Notifications (FCM)
FCM_PROJECT_ID=change-me
FCM_CLIENT_EMAIL=change-me@mycirvia.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_SENDER_ID=1234567890

# Email
EMAIL_PROVIDER=sendgrid
EMAIL_FROM_ADDRESS=no-reply@mycirvia.com
EMAIL_FROM_NAME=MyCirvia
EMAIL_API_KEY=change-me

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

# Observability
SENTRY_DSN=

# Analytics
ANALYTICS_PROVIDER=plausible
ANALYTICS_SITE_ID=mycirvia

# Web (Next.js)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ANALYTICS_SITE_ID=mycirvia
NEXT_PUBLIC_SENTRY_DSN=
ADMIN_BASE_URL=http://localhost:3000/admin

# Mobile (Flutter)
API_BASE_URL=http://localhost:3000
WS_BASE_URL=ws://localhost:3001
SENTRY_DSN=

# Security & compliance
ENCRYPTION_KEY=change-me
BACKUP_ENCRYPTION_KEY=change-me
ADMIN_AUDIT_LOG_RETENTION_DAYS=365
DATA_EXPORT_RETENTION_DAYS=30

# Supabase (if adopted)
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=change-me
SUPABASE_SERVICE_ROLE_KEY=change-me
SUPABASE_JWT_SECRET=change-me
SUPABASE_DB_URL=postgresql://user:pass@db.supabase.co:5432/postgres
SUPABASE_STORAGE_BUCKET=media
SUPABASE_REALTIME_URL=wss://project.supabase.co/realtime/v1
```

---

## Open Questions

1. The architecture currently specifies PostgreSQL + AWS S3 + Redis/WebSockets; should Supabase replace or supplement any of these services?
2. Which transactional email provider should be used (SES, SendGrid, Postmark, etc.)?
3. Should Sentry (or another error tracking provider) be mandatory across all environments?
4. Which privacy-friendly analytics provider is preferred (Plausible, Fathom, self-hosted)?

---

## Handoff

**Files to create/update**
- `docs/agents/02-env-vars.md` (created)

**Final decisions made**
- Documented environment variables for local, staging, and production based on the current architecture.
- Included Supabase variables as conditional requirements pending a decision.

**Assumptions**
- NestJS backend, PostgreSQL (Prisma), Redis, AWS S3, and FCM are the default stack.
- WebSockets are served either alongside the API or as a dedicated service.

**Open questions**
- Whether Supabase will be used and, if so, for which components (auth/db/storage/realtime).
- Final selection of email and analytics providers.
- Whether Sentry (or equivalent) is required in all environments.

**What the next prompt should read**
- “Review the environment variable document in `docs/agents/02-env-vars.md`, resolve the open questions, and update the document with final provider selections and any missing variables.”
