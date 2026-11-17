# Site (Angular) servido como arquivos estáticos pelo static-web-server (binário único, sem nginx).
# Em produção fica atrás do nginx de entrada (infra/nginx), que manda "/" para cá.
FROM node:22-alpine AS build
WORKDIR /src/frontend
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# outputPath do angular.json é "../dist" => /src/dist
RUN npm run build

FROM joseluisq/static-web-server:2.38.0-alpine
COPY --from=build /src/dist /public
# rotas do Angular (/venda, /conta/login...) caem no index.html com status 200
ENV SERVER_PORT=80 \
    SERVER_ROOT=/public \
    SERVER_FALLBACK_PAGE=/public/index.html \
    SERVER_HEALTH=true \
    SERVER_COMPRESSION=true \
    SERVER_CACHE_CONTROL_HEADERS=true \
    SERVER_LOG_LEVEL=warn
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/health || exit 1
