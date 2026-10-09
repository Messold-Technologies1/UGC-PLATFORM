# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: sharp ships prebuilt binaries for glibc, and
# ffmpeg-static's binary is glibc-linked. On musl both fall back to building
# from source or simply fail at runtime.
FROM node:22-slim AS base
WORKDIR /app
# openssl is required by Prisma's query engine; ca-certificates for outbound TLS
# to SES, Meta and Razorpay. fonts-dejavu-core + fontconfig are for the
# watermark: it is SVG text rendered by sharp/librsvg, which silently falls back
# to a thin substitute when the named font is missing — measured at ~23% of the
# intended ink coverage on a bare image, i.e. a watermark barely there. 7 MB to
# have the overlay look the way it is supposed to.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl ca-certificates fontconfig fonts-dejavu-core \
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

# Prove the bundled ffmpeg can actually run the watermark overlay.
#
# The binary is NOT pinned by the lockfile: ffmpeg-static@5.3.0 declares release
# tag b6.1.1, but the asset behind that tag now ships 7.0.2, so two builds of the
# same commit can get different ffmpeg versions. That matters because an ffmpeg
# which cannot run this filter graph does not fail — it writes an audio-only file
# and exits 0 (this is exactly how a watermarked preview with no video stream
# reached production). So run the real filter chain here, on a 64x64 clip: a
# drifted binary fails the BUILD instead of shipping silent duds. ~0.1s.
#
# Keep the filter and the `-loop 1` input in step with WatermarkService.
RUN FF=/app/node_modules/ffmpeg-static/ffmpeg \
    && test -x "$FF" \
    && "$FF" -v error -y -f lavfi -i testsrc2=s=64x64:r=10:d=1 -f lavfi -i sine=d=1 \
        -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest /tmp/wm-src.mp4 \
    && "$FF" -v error -y -f lavfi -i color=white@0.3:s=64x64:d=1 -frames:v 1 /tmp/wm-mark.png \
    && "$FF" -v error -y -i /tmp/wm-src.mp4 -loop 1 -i /tmp/wm-mark.png \
        -filter_complex '[1:v][0:v]scale2ref[wm][base];[base][wm]overlay=0:0:format=auto' \
        -c:v libx264 -pix_fmt yuv420p -c:a copy -shortest /tmp/wm-out.mp4 \
    && "$FF" -v error -i /tmp/wm-out.mp4 -map 0:v:0 -f null - \
    && rm -f /tmp/wm-src.mp4 /tmp/wm-mark.png /tmp/wm-out.mp4


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
