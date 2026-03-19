# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

# Prisma generate needs DATABASE_URL/DIRECT_URL (does not connect)
ENV DATABASE_URL="postgresql://localhost:5432/db"
ENV DIRECT_URL="postgresql://localhost:5432/db"

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/

EXPOSE 3000

CMD ["node", "dist/main.js"]
