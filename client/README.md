# Client (Next.js on Vercel)

The browser calls the API directly at `NEXT_PUBLIC_API_URL` (e.g. `https://api.gocollab.io`). There is no Next.js `/api` proxy.

## Environment variables

| Variable | Where | Example |
|----------|--------|---------|
| `NEXT_PUBLIC_API_URL` | Vercel (required for browser) | `https://api.gocollab.io` |
| `API_URL` | Vercel server routes / SSR | `https://api.gocollab.io` |
| `NEXT_PUBLIC_SITE_URL` | Vercel | `https://gocollab.io` |
| `NEXT_PUBLIC_SOCKET_URL` | Vercel | `https://api.gocollab.io` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Vercel (optional) | `gocollab.io` |

Copy `.env.example` to `.env.local` for local development.

Railway should set `FRONTEND_URL`, `CORS_ORIGIN`, `COOKIE_DOMAIN`, and `GOOGLE_CALLBACK_URL` to match your domains.
