# syntax=docker/dockerfile:1.7
#
# The API image. Two stages: one that installs and generates, one that only
# runs. Everything the runtime needs is copied across, so the final image
# carries no npm cache, no dev dependencies and no build tooling.
#
#   docker build -t iamgeorgia-api .
#   docker run --env-file .env -e NODE_ENV=production -p 5000:5000 iamgeorgia-api
#
# Migrations are NOT run at startup. Run them as a separate step before the
# new version takes traffic, using the same image:
#
#   docker run --env-file .env iamgeorgia-api npx prisma migrate deploy

# Pinned to a major that has type stripping, because db/index.js imports the
# generated Prisma client straight from its TypeScript source (Node 22.18+).
ARG NODE_IMAGE=node:24-bookworm-slim

# --- deps --------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps

# Prisma's migration engine links against OpenSSL, and outbound HTTPS (R2,
# SMTP over TLS) needs a CA bundle. Neither is in the slim image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# `npm ci` runs the postinstall hook, which is `prisma generate`, so the schema
# and the Prisma config have to be present before install — but nothing else,
# so a source change does not invalidate the dependency layer.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# `prisma` itself is a runtime dependency (it applies migrations in the
# pre-deploy step), so --omit=dev only drops pino-pretty and supertest.
RUN npm ci --omit=dev

# --- runtime -----------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/generated ./generated
COPY --chown=node:node . .

# Never run as root: a compromised request handler should not own the image.
USER node

EXPOSE 5000

# Liveness only — the same split app.js makes. /health/db is for the
# orchestrator's readiness probe, not for deciding whether to restart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
