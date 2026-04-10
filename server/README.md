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

## Payments (Razorpay) - local testing (Test Mode)

This project uses **server-created Razorpay Orders** and **webhooks** to mark payments as captured.

### Configure env

Add these to `.env` (use **test mode** keys from Razorpay dashboard):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Create a checkout order

- `POST /api/orders/checkout` (BRAND workspace)
- Body: `{ "creatorId": "<uuid>", "packageId": "<uuid>" }`
- Response includes: `razorpayOrderId`, `amountPaise`, `currency`, and `razorpayKeyId` for frontend checkout.

### Webhook (required for marking paid)

Expose your local server webhook endpoint using a tunnel (ngrok / cloudflared) and configure a Razorpay webhook:

- URL: `POST /api/webhooks/razorpay`
- Events: at minimum `payment.captured` and **`payment.failed`** (failed attempts keep the order **`PENDING_PAYMENT`** so the customer can pay again)

The server verifies signature using `x-razorpay-signature` and `RAZORPAY_WEBHOOK_SECRET`.

Subscribe also to **`refund.processed`** if you want webhook reconciliation after refunds (optional if you only rely on the refund API response). Optionally subscribe to **`refund.failed`**—the server logs it and does **not** change order status (order stays **`REJECTED`** so you can retry).

### Admin: manual creator payout + refund (no RazorpayX)

Funds settle from Razorpay to **your** bank account as per your Razorpay settlement settings. Creator payouts are **manual** (bank/UPI outside Razorpay).

- `POST /api/admin/orders/:id/mark-creator-paid` — after you paid the creator manually; allowed from **`ACCEPTED`** → **`CREATOR_PAYMENT_DONE`** (sets `creatorPaidAt`).
- `POST /api/admin/orders/:id/reject` — refund path; allowed from **`DISPUTED`** only → **`REJECTED`** (closes open disputes as `RESOLVED_REFUNDED`). Body (optional): `{ "resolutionNotes": "..." }`.
- `POST /api/admin/orders/:id/refund` — calls Razorpay **refund** API; allowed from **`REJECTED`** → **`REFUNDED`** on success (stores `razorpayRefundId`, `refundedAt`). If Razorpay returns an error, the order stays **`REJECTED`** and nothing is updated—retry after fixing the issue (e.g. insufficient balance, window expired).

All admin routes require a user with the **ADMIN** role (`JwtAuthGuard` + `AdminGuard`).

### Creator payout details (manual bank / UPI)

Creators save **full** account or UPI data for admin-only manual payouts. Brands never receive these fields from the API.

- `PUT /api/creators/profile/me/payout-details` (CREATOR workspace) — body: optional `accountHolderName`, `accountNumber`, `ifsc` (all required together if using bank) and/or `upiId`.
- `GET /api/creators/profile/me/payout-details` (CREATOR workspace) — **masked** summary (e.g. last 4 of account, masked UPI).
- `GET /api/admin/creators/:creatorProfileId/payout-details` (admin) — **full** values for payment.

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
