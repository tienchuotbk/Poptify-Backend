# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Cài full deps (gồm dev) để build + có CLI typeorm/nest
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Bỏ devDependencies → chỉ còn prod deps cho runtime
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Chỉ copy artifact cần để chạy (dist + prod node_modules + manifest)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Chạy bằng user không phải root (image node có sẵn user `node`)
USER node

EXPOSE 3000

# Migrate (compiled JS datasource) rồi start. Single-instance VPS → an toàn.
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main.js"]
