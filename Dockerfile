# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY auth-server/package.json auth-server/
COPY service/package.json service/
COPY client/package.json client/
RUN npm ci --no-audit --no-fund

FROM deps AS build
ARG VITE_AUTH_URL=http://localhost:4000
ARG VITE_SERVICE_URL=http://localhost:4001
ENV VITE_AUTH_URL=$VITE_AUTH_URL \
    VITE_SERVICE_URL=$VITE_SERVICE_URL
COPY . .
RUN npm run build

FROM node:24-alpine AS auth-server
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/auth-server/dist/index.cjs ./index.cjs
USER node
EXPOSE 4000
CMD ["node", "index.cjs"]

FROM node:24-alpine AS service
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/service/dist/index.cjs ./index.cjs
USER node
EXPOSE 4001
CMD ["node", "index.cjs"]

FROM nginx:1.27-alpine AS client
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
