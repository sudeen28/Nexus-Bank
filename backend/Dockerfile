# ── Build stage ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production stage ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/prisma ./src/prisma

RUN mkdir -p uploads logs && chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
