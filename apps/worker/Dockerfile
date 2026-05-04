FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm --workspace apps/worker run build

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p apps/worker/dist data
COPY --from=builder /app/apps/worker/dist/index.js ./apps/worker/dist/index.js
CMD ["node", "apps/worker/dist/index.js"]
