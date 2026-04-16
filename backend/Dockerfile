FROM node:20-alpine

WORKDIR /app

# curl is used by the backend container healthcheck in docker-compose.
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install --omit=dev

COPY . ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
