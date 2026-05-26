# ---- Builder: bundle TS/JS into a single JS file (no tsx/esbuild at runtime) ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (incl. dev) so esbuild is available for the bundle step
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source and produce dist/index.js
COPY . .
RUN npm run build

# ---- Runtime: plain node with production deps only ----
FROM node:22-alpine

WORKDIR /app

# Production dependencies only — excludes tsx/esbuild/typescript/@types
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bundled application code from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 4001

CMD ["node", "dist/index.js"]
