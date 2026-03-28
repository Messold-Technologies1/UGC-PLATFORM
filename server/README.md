# UGC Platform API

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

## Media uploads (S3 + CDN)

Uploads use a **presigned URL** flow:

1. Request presign URL (API)
2. Upload file directly to S3 using returned `uploadUrl` + `headers`
3. Submit `...Key` in the create/update API so the server stores the key and computes the CDN URL

### Profile image

- `POST /api/creators/profile/uploads/presign` (auth) → presign profile image upload
- Upload to returned `uploadUrl` with returned headers
- `POST /api/creators/profile` accepts temporary `profileImageKey` and finalizes it to `creator-profile/<creatorId>/...`
- `PATCH /api/creators/:id` accepts finalized `profileImageKey` for existing profile updates

### Creator portfolio videos

- `POST /api/creator-portfolio/uploads/presign` (auth) → presign video/thumbnail uploads
- `POST /api/creator-portfolio/videos` create a video entry
- `GET /api/creator-portfolio/videos/me` list current creator videos
- `GET /api/creator-portfolio/creators/:creatorId/videos` list public videos by creator id
- `PATCH /api/creator-portfolio/videos/:id` update metadata/visibility
- `DELETE /api/creator-portfolio/videos/:id` delete

### Suggestions (predefined + custom)

- `GET /api/creator-portfolio/suggestions/industries`
- `GET /api/creator-portfolio/suggestions/tags`
- `GET /api/creator-portfolio/suggestions/languages`

## Docker

```bash
docker build -t ugc-server .
docker run -p 3000:3000 --env-file .env ugc-server
```

In CI/CD, run `prisma migrate deploy` before starting the container to apply migrations.

## Links

- [Neon + Prisma](https://neon.tech/docs/guides/prisma)
- [NestJS docs](https://docs.nestjs.com)
