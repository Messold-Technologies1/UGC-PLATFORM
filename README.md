# GoCollab — UGC Creator Marketplace

GoCollab is a full-stack marketplace that connects brands with User-Generated Content (UGC) creators. Brands discover, brief, and pay creators in one place; creators manage their portfolio, packages, and orders from a dedicated dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Architecture](#architecture)
- [Core Flows](#core-flows)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

---

## Overview

GoCollab solves the friction in UGC production:

- **For brands** — search verified creators by niche, content style, language, and budget; place orders in a few clicks; receive revision-tracked deliverables; pay securely via escrow.
- **For creators** — build a public profile with a shareable URL (`/{displayName}`), showcase a video portfolio, set tiered packages and add-ons, and manage the full order lifecycle from a single dashboard.

---

## Key Features

### For Brands
- **Browse & filter creators** — search by niche, content format, language, location, and price
- **Public creator profiles** — shareable `/{displayName}` pages with portfolio reels, packages, ratings, and a Book CTA
- **Secure checkout** — Razorpay escrow-protected payments; funds released only on delivery
- **Brief management** — structured creative brief flow tied to each order
- **Real-time order chat** — per-order messaging between brand and creator via Socket.IO
- **Review & ratings** — post-delivery brand reviews feed into creator public profiles

### For Creators
- **Profile builder** — display name, bio, profile image, intro reel, niche/style/language facets, on-location availability
- **Portfolio** — upload and manage video portfolio visible on the public profile
- **Packages & add-ons** — tiered pricing (Basic / Standard / Premium) with optional add-ons (rush delivery, paid-ad rights, extra revisions, etc.)
- **Order dashboard** — track incoming orders, submit deliverables, handle revisions
- **Earnings & payouts** — bank or UPI payout configuration

### Platform
- **Multi-role auth** — single user account supports BRAND, CREATOR, ADMIN, and AGENCY roles
- **Agency workspace** — agencies can manage multiple brand sub-accounts
- **Admin panel** — creator approval, order oversight, and platform management
- **Email notifications** — transactional emails via AWS SES
- **Webhooks** — Razorpay payment events and SES delivery/bounce events
- **Rate limiting** — per-IP throttling via NestJS Throttler
- **Swagger docs** — auto-generated API docs at `/docs` (non-production)

---

## Tech Stack

### Client (`/client`)
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State / Data | TanStack React Query v5, Redux Toolkit |
| Forms | React Hook Form + Zod |
| Payments | Razorpay SDK |
| Real-time | Socket.IO client |
| UI primitives | Radix UI, Ark UI, Vaul, Embla Carousel |
| Charts | Chart.js + react-chartjs-2 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner |

### Server (`/server`)
| Layer | Technology |
|---|---|
| Framework | NestJS (Express adapter) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh tokens), HTTP-only cookies |
| Payments | Razorpay |
| Storage | AWS S3 (creator media, deliverables) |
| Email | AWS SES |
| Real-time | Socket.IO (NestJS gateway) |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI |
| Security | Helmet, CORS, rate limiting |

---

## Project Structure

```
UGC-PLATFORM/
├── client/                  # Next.js 15 frontend
│   ├── app/                 # App Router pages
│   │   ├── [displayName]/   # Public creator profile (shareable)
│   │   ├── brand/           # Brand dashboard
│   │   ├── creator/         # Creator dashboard
│   │   ├── admin/           # Admin panel
│   │   └── (main)/          # Marketing / landing pages
│   ├── features/            # Feature-sliced modules
│   │   ├── auth/            # Auth hooks, API calls
│   │   ├── creators/        # Creator listing, profile, browse
│   │   ├── creator-portfolio/ # Portfolio upload & display
│   │   ├── orders/          # Order management
│   │   ├── briefs/          # Creative brief flow
│   │   ├── payments/        # Razorpay checkout hooks
│   │   └── chats/           # Real-time order chat
│   ├── components/          # Shared UI components
│   │   ├── landing/         # Marketing landing sections
│   │   └── ui/              # Primitive UI components
│   └── providers/           # React context providers (Auth, Query, Theme)
│
└── server/                  # NestJS backend
    └── src/
        ├── auth/            # JWT auth, guards, strategies
        ├── creator-profile/ # Creator profile CRUD + search
        ├── creator-portfolio/ # Portfolio video management
        ├── brand-profile/   # Brand profile management
        ├── orders/          # Order lifecycle
        ├── briefs/          # Brief creation & management
        ├── razorpay/        # Payment processing + webhooks
        ├── order-chat/      # Per-order real-time chat
        ├── chats/           # General messaging
        ├── creator-reviews/ # Brand reviews of creators
        ├── storage/         # AWS S3 file uploads
        ├── mail/            # AWS SES email service
        ├── agency/          # Agency workspace management
        ├── jobs/            # Background/scheduled jobs
        ├── realtime/        # Socket.IO gateway
        └── webhooks/        # Razorpay + SES webhook handlers
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm or npm
- AWS account (S3 + SES)
- Razorpay account

### Environment Variables

#### Server (`server/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ugcplatform
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=4000
CORS_ORIGIN=http://localhost:3000

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# AWS SES
SES_FROM_EMAIL=noreply@yourdomain.com

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

SWAGGER_ENABLED=true
NODE_ENV=development
```

#### Client (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Running Locally

#### 1. Server

```bash
cd server
npm install
npx prisma migrate dev      # run migrations
npx prisma generate         # generate Prisma client
npm run start:dev           # starts on port 4000
```

API docs available at `http://localhost:4000/docs`

#### 2. Client

```bash
cd client
npm install
npm run dev                 # starts on port 3000
```

Open `http://localhost:3000`

---

## Architecture

```
Browser
  │
  ▼
Next.js 15 (App Router)
  ├── Server Components  → fetch data at build/request time (ISR + SSR)
  ├── Client Components  → interactive UI, React Query for client-side data
  └── API Routes         → minimal (auth redirect helpers)
  │
  ▼ HTTP / WebSocket
NestJS API (REST)
  ├── JWT Auth (HTTP-only refresh cookie + Bearer access token)
  ├── Prisma ORM → PostgreSQL
  ├── S3 for media storage
  ├── SES for transactional email
  ├── Razorpay for payments + escrow
  └── Socket.IO for real-time order chat
```

**Key architectural decisions:**

- **ISR on public pages** — creator profiles and listings are revalidated every hour (`export const revalidate = 3600`), giving near-static performance with fresh data
- **Optional JWT guard** — public API endpoints (`GET /creator-profile/:id`) use `OptionalJwtAuthGuard`, which silently populates `req.user` when a valid token is present and allows unauthenticated access otherwise
- **Feature-sliced frontend** — each product domain (creators, orders, briefs, payments) lives in its own `features/` module with co-located API calls, hooks, types, and components
- **Escrow payments** — Razorpay orders are created server-side; funds are captured only after creator delivers and brand confirms

---

## Core Flows

### Brand books a creator
1. Brand browses `/{displayName}` or `/brand/creators`
2. Selects a package + optional add-ons → Razorpay checkout (escrow)
3. On payment success → redirected to `/brand/briefs/create?orderId=…`
4. Brand fills creative brief → submitted to creator
5. Creator delivers via `/creator/orders/[orderId]`
6. Brand reviews deliverables, requests revisions or marks complete
7. On completion → funds released to creator, brand leaves review

### Creator sets up profile
1. Registers at `/register/creator` → profile creation wizard
2. Fills bio, niche/style/language facets, on-location availability
3. Uploads intro reel and portfolio videos
4. Sets packages (name, price, delivery days, revisions, video length)
5. Sets add-ons (rush delivery, paid-ad rights, extra revisions, etc.)
6. Profile goes live at `/{displayName}` after admin approval

---

## API Documentation

When running locally with `SWAGGER_ENABLED=true`, interactive API docs are available at:

```
http://localhost:4000/docs
```

All endpoints are prefixed with `/api`. Authentication uses JWT Bearer tokens for most routes; public creator browsing and profile endpoints allow unauthenticated access.

---

## Contributing

1. Branch off `development` — never push directly to `main`
2. Name branches descriptively: `feat/…`, `fix/…`, `chore/…`
3. Open PRs targeting `development`; `main` is the production branch
4. Run `npx tsc --noEmit` in `client/` before pushing to catch type errors
5. Keep commits atomic and descriptive
