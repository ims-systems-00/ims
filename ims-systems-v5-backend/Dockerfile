# syntax=docker/dockerfile:1

# Build context: repository root (pnpm workspace + lockfile).
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY ims-systems-v5-backend/package.json ./ims-systems-v5-backend/
RUN pnpm install --filter ims-systems-v5-backend... --frozen-lockfile

FROM deps AS build
COPY ims-systems-v5-backend ./ims-systems-v5-backend
RUN pnpm --filter ims-systems-v5-backend typecheck \
  && pnpm --filter ims-systems-v5-backend build

FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

ENV NODE_ENV=development \
    PORT=3001

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY ims-systems-v5-backend/package.json ./ims-systems-v5-backend/
RUN pnpm install --filter ims-systems-v5-backend... --prod --frozen-lockfile

COPY --from=build /app/ims-systems-v5-backend/dist ./ims-systems-v5-backend/dist

WORKDIR /app/ims-systems-v5-backend
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/app/server.js"]
