FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck in docker-compose
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
