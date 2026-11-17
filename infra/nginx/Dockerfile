# Nginx de entrada: único serviço com domínio no Coolify. Encaminha:
#   /app/  e /api/  -> backend (Spring Boot, 8080)
#   /ws/            -> soketi  (WebSocket/Pusher, 6001; o prefixo /ws é removido)
#   /               -> site    (Angular estático, 80)
FROM nginx:1.27-alpine
# o entrypoint da imagem aplica envsubst nos *.template (só nas variáveis definidas abaixo/no compose)
ENV NGINX_CLIENT_MAX_BODY_SIZE=6m \
    NGINX_ENVSUBST_FILTER=^NGINX_
COPY templates/ /etc/nginx/templates/
COPY snippets/ /etc/nginx/snippets/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/nginx-health || exit 1
