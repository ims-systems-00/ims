FROM node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=8790 NODE_ENV=production RLY_DATA=/data/store.json
VOLUME ["/data"]
EXPOSE 8790
HEALTHCHECK CMD wget -qO- http://localhost:8790/v1/health || exit 1
CMD ["node", "server/server.js"]
