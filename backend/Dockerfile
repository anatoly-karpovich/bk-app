FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV BK_APP_ENV_FILE=.env.docker

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY .env.docker ./.env.docker
COPY backups/db-data-projects ./backups/db-data-projects

EXPOSE 3004

CMD ["node", "dist/server.js"]
