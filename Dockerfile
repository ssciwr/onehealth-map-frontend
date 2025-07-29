FROM node:22-slim AS base

LABEL org.opencontainers.image.source=https://github.com/ssciwr/onehealth-frontend
LABEL org.opencontainers.image.description="Onehealth Frontend"
LABEL org.opencontainers.image.licenses=MIT

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY frontend/ .
ENV NODE_ENV=production
RUN pnpm build

FROM nginx:alpine

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom nginx config
COPY ./nginx/conf/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
