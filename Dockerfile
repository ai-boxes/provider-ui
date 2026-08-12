FROM node:24-bookworm-slim AS builder
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run build

FROM ghcr.io/static-web-server/static-web-server:2-alpine AS runtime
COPY --from=builder /src/dist /public

ENV SERVER_HOST=0.0.0.0 \
    SERVER_PORT=8080 \
    SERVER_ROOT=/public \
    SERVER_FALLBACK_PAGE=/public/index.html \
    SERVER_HEALTH=true \
    SERVER_COMPRESSION=true \
    SERVER_CACHE_CONTROL_HEADERS=true \
    SERVER_ETAG=true

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
