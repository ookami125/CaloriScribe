FROM node:20-bookworm-slim

WORKDIR /app
ENV DATABASE_URL="file:./data/nutrition.db"

COPY package.json package-lock.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY lib ./lib
COPY public ./public
COPY views ./views
COPY scripts ./scripts
COPY server.js ./server.js

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
