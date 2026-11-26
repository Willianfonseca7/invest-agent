FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm --workspace apps/worker run build

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p apps/worker/dist data
COPY --from=builder /app/apps/worker/dist/index.js ./apps/worker/dist/index.js
COPY --from=builder /app/apps/worker/dist/index.js.safety.json ./apps/worker/dist/index.js.safety.json
COPY --from=builder /app/scripts/safe-artifact.cjs ./scripts/safe-artifact.cjs
CMD ["node", "scripts/safe-artifact.cjs", "start", "worker"]
