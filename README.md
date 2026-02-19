# MyCirvia Monorepo

## Prerequisites
- Node.js 20+
- pnpm
- Docker (for local infra)

## Boot local infrastructure
```bash
docker compose -f infra/docker-compose.yml up -d
```

## Install dependencies
```bash
pnpm -w install
```

## Run apps
```bash
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter worker dev
```

## Media worker
```bash
pnpm --filter api worker:dev
```

Required API environment variables for media upload pipeline:
- `AWS_S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`

## Troubleshooting
- **Docker services not starting:** Ensure Docker Desktop/Engine is running and ports 5432/6379/4566 are free.
- **Database connection errors:** Verify `apps/api/.env.local` matches `infra/docker-compose.yml` connection details.
- **pnpm install failures:** Confirm Node.js 20+ and `pnpm --version` succeeds.

## Realtime chat identity events (frontend integration)
When chat identity visibility changes, the API emits websocket room events for authorized chat participants:

- `identity-revealed`
  - payload: `{ event, chatId, revealedBy, newIdentity }`
  - frontend behavior: update identity UI immediately + show reveal toast.
- `identity-revoked`
  - payload: `{ event, chatId, revokedBy, newIdentity, refreshMessages: true }`
  - frontend behavior: update identity UI, show revoke toast, and refresh sender display names across existing messages.
- `identity-changed`
  - payload: `{ event, chatId, changedBy, reason, newIdentity }`
  - emitted on reveal/revoke as a generic identity scope invalidation signal.

Message text remains unchanged; only sender display identity should be re-resolved in UI.
