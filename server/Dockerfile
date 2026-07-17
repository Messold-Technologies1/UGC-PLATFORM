# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Prisma generate needs DATABASE_URL/DIRECT_URL (does not connect). These must
# be set before `npm ci` because the postinstall hook runs `prisma generate`.
ENV DATABASE_URL="postgresql://localhost:5432/db"
ENV DIRECT_URL="postgresql://localhost:5432/db"

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# System ffmpeg for delivery watermarking. ffmpeg-static ships a glibc binary
# that can't run on Alpine (musl), so install the native package and point the
# watermark service at it via FFMPEG_PATH.
# fontconfig + a real font are required for Sharp/librsvg to render the SVG
# watermark text — without them the text rasterizes to blank/tofu glyphs and
# the watermark is invisible.
RUN apk add --no-cache ffmpeg fontconfig ttf-dejavu && fc-cache -f
ENV FFMPEG_PATH=/usr/bin/ffmpeg

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/

EXPOSE 3000

CMD ["node", "dist/main.js"]
