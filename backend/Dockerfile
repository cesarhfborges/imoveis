# Build e execução do backend (WAR executável) em contêiner.
#   docker build -t imoveis-backend .
#   docker run -p 8080:8080 -e DB_URL=jdbc:postgresql://host:5432/imoveis -e DB_USER=... -e DB_PASSWORD=... \
#              -e APP_FRONTEND_ORIGINS=https://seu-dominio -e APP_ADMIN_EMAIL=... -e APP_ADMIN_SENHA=... imoveis-backend
# Em produção é usado pelo docker-compose.yml da raiz (Coolify).
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY shared-kernel/pom.xml shared-kernel/
COPY listing/pom.xml listing/
COPY platform/pom.xml platform/
COPY moderation/pom.xml moderation/
COPY core-api/pom.xml core-api/
RUN mvn -B -q -Pprod dependency:go-offline -DskipTests || true
COPY . .
RUN mvn -B -Pprod -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
# curl: usado pelo health check (GET /actuator/health)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home imoveis && mkdir -p /var/lib/imoveis/uploads && chown -R imoveis /var/lib/imoveis
COPY --from=build /src/core-api/target/imoveis.war /app/imoveis.war
USER imoveis
EXPOSE 8080
ENV TZ=America/Sao_Paulo \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${PORT:-8080}/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/imoveis.war"]
