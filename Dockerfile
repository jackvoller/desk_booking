# Multi-stage build: everything heavy (npm install, vite build) happens here on
# Koyeb's builder, so the running instance only has to start node. The previous
# buildpack setup ran installs at boot on a 0.1 vCPU instance, which took minutes
# and failed the platform health check on every cold start.

FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --include=dev
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
ENV PORT=8000
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./server/public
EXPOSE 8000
CMD ["node", "server/src/index.js"]
