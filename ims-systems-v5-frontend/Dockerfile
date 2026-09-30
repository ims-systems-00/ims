# syntax=docker/dockerfile:1

# Build context: repository root (pnpm workspace + lockfile).
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY ims-systems-v5-frontend/package.json ./ims-systems-v5-frontend/
RUN pnpm install --filter ims-systems-v5-frontend... --frozen-lockfile

FROM deps AS build
COPY ims-systems-v5-frontend ./ims-systems-v5-frontend

# Same-origin API path served by Nginx. Vite mode "docker" keeps the
# development-stub security provider allowed until real auth exists.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SECURITY_PROVIDER=development-stub
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SECURITY_PROVIDER=$VITE_SECURITY_PROVIDER

RUN pnpm --filter ims-systems-v5-frontend typecheck \
  && pnpm --filter ims-systems-v5-frontend exec vite build --mode docker

FROM nginx:1.27-alpine AS runtime
COPY ims-systems-v5-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/ims-systems-v5-frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
