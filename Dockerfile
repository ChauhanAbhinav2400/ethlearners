# ─── Stage 1: Install all deps + build backend ───────────────────────────────
FROM node:22.20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# packages/shared is imported by both workspaces
COPY packages/ ./packages/

# Install ALL deps (including devDependencies needed for build)
RUN npm ci --ignore-scripts

# Copy source
COPY backend/ ./backend/
COPY packages/ ./packages/

# Build backend (tsc check + esbuild bundle → backend/dist/)
RUN npm run build -w @explorer/backend

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:22.20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY packages/ ./packages/

# Install production deps only
RUN npm ci --omit=dev --ignore-scripts -w @explorer/backend

# Copy compiled backend from builder
COPY --from=builder /app/backend/dist ./backend/dist

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

# Graceful shutdown is handled in server.ts via SIGTERM
CMD ["node", "backend/dist/server.mjs"]
