# ── Next.js frontend (production) ────────────────────────────────────────────
# Builds the app and serves it with `next start`. Server-side route handlers
# proxy /api/* to the Django backend via the DJANGO_API_URL runtime env var.

# 1) Install dependencies (incl. dev deps needed to build)
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runtime image — production deps only (no dev deps, no duplicated node_modules)
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
# Install ONLY production dependencies — a fresh, smaller node_modules than the
# builder's full dev+prod tree. Keeps the runtime image ~half the size.
RUN npm ci --omit=dev && npm cache clean --force

EXPOSE 3000
CMD ["npm", "run", "start"]
