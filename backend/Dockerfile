# One image, two processes: the API (default CMD) and the queue worker
# (`node src/worker.js`, set by docker-compose / the orchestrator). They share
# code and dependencies but are deployed and scaled separately, as
# docs/ARCHITECTURE.md §9 describes.
#
# Debian slim rather than Alpine: pdf-parse pulls in a native canvas binding,
# and glibc has the widest prebuilt-binary support.

# ---- deps: production dependencies only, cached until the lockfile changes ----
FROM node:25-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ------------------------------------------------------------------
FROM node:25-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Never run as root inside the container.
USER node

EXPOSE 4000

# Liveness only (/health never touches MongoDB or Redis). The orchestrator's
# readiness probe should use /ready. Overridden for the worker, which has no
# HTTP port.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
