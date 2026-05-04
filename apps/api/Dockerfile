FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm --workspace apps/api run build

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p apps/api/dist data
COPY --from=builder /app/apps/api/dist/server.js ./apps/api/dist/server.js
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
