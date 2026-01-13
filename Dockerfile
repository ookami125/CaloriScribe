FROM node:20-bookworm-slim

WORKDIR /app
ENV DATABASE_URL="file:./data/nutrition.db"
ENV AUTH_DATABASE_URL="file:./data/auth.db"

COPY package.json package-lock.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm ci

COPY external ./external
COPY lib ./lib
COPY public ./public
COPY views ./views
COPY scripts ./scripts
COPY server.js ./server.js

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
