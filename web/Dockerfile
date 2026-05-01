FROM node:22-alpine

WORKDIR /app

# Install all dependencies (including devDependencies for Vite)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
