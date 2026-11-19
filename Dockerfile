# ==============================================================================
# Samvaad Root Dockerfile for Render / Cloud Deployment
# Multi-stage build targeting OpenJDK 21 LTS with low memory footprint
# ==============================================================================

# Stage 1: Maven Build
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /workspace

# Cache dependencies
COPY backend/pom.xml ./pom.xml
RUN mvn dependency:resolve -B

# Compile and package production JAR
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Lightweight Runtime Image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Run as non-privileged user for security compliance
RUN addgroup --system samvaad && adduser --system samvaad --ingroup samvaad

# Create uploads directory and assign permissions
RUN mkdir -p /app/uploads && chown -R samvaad:samvaad /app

USER samvaad:samvaad

# Copy binary from build stage
COPY --from=build /workspace/target/app.jar app.jar

# Render dynamically sets $PORT (usually 10000 on free web services)
EXPOSE 8080 10000

# Execute Spring Boot with container-aware memory flags, dynamic PORT, and auto-convert postgres:// to jdbc:postgresql://
ENTRYPOINT ["sh", "-c", "if [ -n \"$DATABASE_URL\" ] && echo \"$DATABASE_URL\" | grep -qE '^postgres(ql)?://'; then export SPRING_DATASOURCE_URL=$(echo \"$DATABASE_URL\" | sed -e 's|^postgres://|jdbc:postgresql://|' -e 's|^postgresql://|jdbc:postgresql://|'); fi; exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=50.0 -XX:+UseSerialGC -Xss512k -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom -Dserver.port=${PORT:-8080} -Dserver.address=0.0.0.0 -jar app.jar"]
