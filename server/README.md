# Collabry API

NestJS backend with Swagger, Prisma, and Neon PostgreSQL.

## Prerequisites

- Node.js 18+
- Neon account ([neon.tech](https://neon.tech))

## Setup

1. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

2. **Configure Neon**

   - Create a project at [Neon Console](https://console.neon.tech)
   - Copy **pooled** connection string → `DATABASE_URL`
   - Copy **direct** connection string → `DIRECT_URL`

3. **Install and migrate**

   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma client** (if not run by migrate)

   ```bash
   npm run prisma:generate
   ```

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run start:dev` | Start with hot reload                |
| `npm run start:prod` | Start production build              |
| `npm run build`  | Compile TypeScript                   |
| `npm run prisma:migrate` | Run migrations (dev)            |
| `npm run prisma:studio` | Open Prisma Studio              |
| `npm run test`   | Unit tests                           |
| `npm run test:e2e` | E2E tests                         |

## Endpoints

- **API base**: `http://localhost:3000/api`
- **Swagger docs**: `http://localhost:3000/docs` (disabled in production unless `SWAGGER_ENABLED=true`)
- **Health check**: `GET /api/health`

## Docker

```bash
docker build -t ugc-server .
docker run -p 3000:3000 --env-file .env ugc-server
```

In CI/CD, run `prisma migrate deploy` before starting the container to apply migrations.

## Links

- [Neon + Prisma](https://neon.tech/docs/guides/prisma)
- [NestJS docs](https://docs.nestjs.com)
