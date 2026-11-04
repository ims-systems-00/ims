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

# Same-origin API via Nginx. mode=docker allows development-stub for demos;
# set VITE_SECURITY_PROVIDER=auth0-openfga (+ Auth0 ARGs) for prod-like Auth0.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SECURITY_PROVIDER=development-stub
ARG VITE_ONLYOFFICE_URL=
ARG VITE_AUTH0_DOMAIN=
ARG VITE_AUTH0_CLIENT_ID=
ARG VITE_AUTH0_AUDIENCE=
ARG VITE_AUTH0_ORGANIZATION_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SECURITY_PROVIDER=$VITE_SECURITY_PROVIDER \
    VITE_ONLYOFFICE_URL=$VITE_ONLYOFFICE_URL \
    VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE \
    VITE_AUTH0_ORGANIZATION_ID=$VITE_AUTH0_ORGANIZATION_ID

RUN pnpm --filter ims-systems-v5-frontend typecheck \
  && pnpm --filter ims-systems-v5-frontend exec vite build --mode docker

FROM nginx:1.27-alpine AS runtime
COPY ims-systems-v5-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/ims-systems-v5-frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
