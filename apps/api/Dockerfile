FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm --workspace apps/api run build

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p apps/api/dist data
COPY --from=builder /app/apps/api/dist/server.js ./apps/api/dist/server.js
COPY --from=builder /app/apps/api/dist/server.js.safety.json ./apps/api/dist/server.js.safety.json
COPY --from=builder /app/scripts/safe-artifact.cjs ./scripts/safe-artifact.cjs
EXPOSE 3001
CMD ["node", "scripts/safe-artifact.cjs", "start", "api"]
