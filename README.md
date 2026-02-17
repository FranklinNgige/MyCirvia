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
