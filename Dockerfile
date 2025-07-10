FROM node:22-slim AS base

LABEL org.opencontainers.image.source=https://github.com/ssciwr/onehealth-frontend
LABEL org.opencontainers.image.description="Onehealth Frontend"
LABEL org.opencontainers.image.licenses=MIT

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY frontend/ .

FROM base AS prod-deps
RUN yes | pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:alpine

COPY --from=build app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80
EXPOSE 443

# Start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]
