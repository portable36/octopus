# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# Native addons (e.g. argon2) during install/build
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend
COPY frontend frontend

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
ARG NEXT_PUBLIC_APP_NAME=Octopus
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

RUN npm run build

FROM node:22-alpine AS prune

WORKDIR /app

COPY --from=build /app /app

ENV NODE_ENV=production

RUN npm prune --omit=dev

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache wget

USER node

COPY --chown=node:node --from=prune /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=prune /app/node_modules ./node_modules
COPY --chown=node:node --from=prune /app/backend/package.json ./backend/package.json
COPY --chown=node:node --from=prune /app/backend/dist ./backend/dist
COPY --chown=node:node --from=prune /app/backend/mikro-orm.config.ts ./backend/mikro-orm.config.ts

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health/live || exit 1

CMD ["node", "dist/main.js"]
