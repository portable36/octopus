# syntax=docker/dockerfile:1
# Octopus monorepo — multi-stage production image (NestJS API + Next.js + workers).
#
# Build:  docker compose -f docker-compose.prod.yml build
# Run:    docker compose -f docker-compose.prod.yml up -d

# -----------------------------------------------------------------------------
# Stage 1 (Builder): install workspaces (incl. root devDependencies) and build.
# -----------------------------------------------------------------------------
FROM node:26-alpine AS builder

WORKDIR /app

# Native addons (argon2, sharp) during install/build.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend
COPY frontend frontend

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_APP_NAME=Octopus
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_GEM_SCHEMA_VERSION=2.4.0
ARG NEXT_PUBLIC_GEM_TRACKING_ENVIRONMENT=production

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_GEM_SCHEMA_VERSION=${NEXT_PUBLIC_GEM_SCHEMA_VERSION} \
    NEXT_PUBLIC_GEM_TRACKING_ENVIRONMENT=${NEXT_PUBLIC_GEM_TRACKING_ENVIRONMENT}

RUN npm run build:backend && npm run build:frontend

# -----------------------------------------------------------------------------
# Intermediate: drop devDependencies from root + workspace packages.
# -----------------------------------------------------------------------------
FROM node:26-alpine AS production-prune

WORKDIR /app

COPY --from=builder /app /app

ENV NODE_ENV=production

RUN npm prune --omit=dev \
    --workspace @octopus/backend \
    --workspace @octopus/frontend \
    --include-workspace-root

# -----------------------------------------------------------------------------
# Stage 2 (Runner): production-only tree, non-root, API + worker + storefront.
# -----------------------------------------------------------------------------
FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NODE_OPTIONS=--max-old-space-size=512

RUN apk add --no-cache wget libc6-compat \
    && mkdir -p /app/backend/.cache/seo \
    && chown -R node:node /app

USER node

COPY --chown=node:node --from=production-prune /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=production-prune /app/node_modules ./node_modules
COPY --chown=node:node --from=production-prune /app/backend/package.json ./backend/package.json
COPY --chown=node:node --from=production-prune /app/backend/dist ./backend/dist
COPY --chown=node:node --from=production-prune /app/backend/mikro-orm.config.ts ./backend/mikro-orm.config.ts
COPY --chown=node:node --from=production-prune /app/frontend/package.json ./frontend/package.json
COPY --chown=node:node --from=production-prune /app/frontend/next.config.ts ./frontend/next.config.ts
COPY --chown=node:node --from=production-prune /app/frontend/.next ./frontend/.next
COPY --chown=node:node --from=production-prune /app/frontend/public ./frontend/public

# Backend API (4000) and Next.js storefront (3000).
EXPOSE 4000 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health/live || exit 1

CMD ["npm", "run", "start", "-w", "backend"]
