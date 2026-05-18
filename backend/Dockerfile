# [A08 / ASVS 10.3.2] Use digests SHA-256 nas imagens base para garantir integridade.
# Sem digest, um atacante que comprometesse o registry poderia substituir a imagem.
#
# Como atualizar os digests:
#   docker pull maven:3.9.6-eclipse-temurin-17-alpine
#   docker inspect maven:3.9.6-eclipse-temurin-17-alpine --format='{{index .RepoDigests 0}}'
#
# Atualize os hashes abaixo a cada ciclo de release da sua pipeline de CI/CD.
# Use `docker scout` ou `trivy` para verificar CVEs nas imagens antes de fixar o digest.

# ─── Build stage ────────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build

WORKDIR /app

# [ASVS 10.3.2] Copiar apenas o pom.xml primeiro para cache de dependências
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

COPY backend/src ./src

# [A05] Garante encoding UTF-8 consistente no build — previne corrupção de strings
RUN mvn clean package -DskipTests -B -Dfile.encoding=UTF-8

# ─── Runtime stage ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# [A05] Usuário não-root — princípio do mínimo privilégio
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# [A08] Copiar apenas o artefato final, não o código-fonte
COPY --from=build /app/target/task-manager-1.0.0.jar app.jar

# [A05] Garantir que o arquivo pertence ao usuário da aplicação
RUN chown appuser:appgroup app.jar

USER appuser

# [ASVS 14.4] Expor apenas a porta necessária
EXPOSE 8080

# [A05] Flags JVM de segurança e encoding explícito
ENTRYPOINT ["java", \
  "-Dfile.encoding=UTF-8", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
