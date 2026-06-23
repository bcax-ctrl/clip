# ---- deps + build ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# NEXT_PUBLIC_* vars are inlined at build time; provide sensible container defaults.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output bundles only what's needed to run.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
