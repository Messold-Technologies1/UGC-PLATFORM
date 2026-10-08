# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: sharp ships prebuilt binaries for glibc, and
# ffmpeg-static's binary is glibc-linked. On musl both fall back to building
# from source or simply fail at runtime.
FROM node:22-slim AS base
WORKDIR /app
# openssl is required by Prisma's query engine; ca-certificates for outbound TLS
# to SES, Meta and Razorpay.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# ---- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `prisma generate` runs on postinstall and reads the datasource block, so the
# variables must exist — it never connects, so placeholders are correct here.
# The real values are injected at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci


# ---- build ------------------------------------------------------------------
FROM deps AS build
COPY . .
# nest-cli copies mail/templates into dist (see nest-cli.json assets). Those
# files are the renderer's fallback until every template exists in the database,
# so an image without them would render nothing before the seeder has run.
RUN npm run build \
    && test -f dist/main.js \
    && test -f dist/main.worker.js \
    && test "$(find dist/mail/templates -name '*.hbs' | wc -l)" -gt 0


# ---- production dependencies -----------------------------------------------
FROM deps AS prod-deps
RUN npm prune --omit=dev


# ---- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# Never run as root.
USER node
WORKDIR /app

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node package.json ./

EXPOSE 4000

# Overridden to `node dist/main.worker.js` for the worker service. One image,
# two processes — so the two can never drift out of sync.
CMD ["node", "dist/main.js"]
