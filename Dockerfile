FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

RUN npm run build

FROM node:20-alpine AS backend

WORKDIR /app

# curl is used by the backend container healthcheck in docker-compose.
RUN apk add --no-cache curl

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./
COPY --from=frontend-build /app/dist ./frontend-dist

ENV NODE_ENV=production
ENV PORT=5000
ENV FRONTEND_DIST_DIR=/app/frontend-dist

EXPOSE 5000

CMD ["npm", "start"]
