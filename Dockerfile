# Production image for Render and other Docker hosts.
FROM oven/bun:1.4.4 AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.4.4 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 10000

CMD ["bun", "dist/server.cjs"]
