FROM node:22-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/ssciwr/mondey
LABEL org.opencontainers.image.description="OneHealth frontend production image"

WORKDIR /app

COPY package.json ./

COPY pnpm-lock.yaml ./

COPY pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm run build

FROM nginx:1.27.3

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# WIP in progress based on similar repo (Mondey)