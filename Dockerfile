FROM node:20-alpine

WORKDIR /app
ENV DATABASE_URL="file:./data/nutrition.db"

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
COPY server.js ./server.js

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
