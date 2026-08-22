# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --workspace backend --include-workspace-root=false

COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/mikro-orm.config.ts backend/mikro-orm.config.ts
COPY backend/src backend/src

WORKDIR /app/backend
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S octopus && adduser -S octopus -G octopus

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace backend --omit=dev --include-workspace-root=false

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/mikro-orm.config.ts ./backend/mikro-orm.config.ts

WORKDIR /app/backend
USER octopus

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health/live || exit 1

CMD ["node", "dist/main.js"]
