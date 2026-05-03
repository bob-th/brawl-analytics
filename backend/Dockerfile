FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
# Includes devDependencies so nodemon is available when compose overrides the
# command to `npm run dev` for hot-reload via `docker compose watch`.
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

EXPOSE 4000

CMD ["node", "index.js"]
