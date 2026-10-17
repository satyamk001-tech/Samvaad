# ==============================================================================
# Samvaad Backend Production Dockerfile for Render / Cloud Deployment
# Multi-stage build targeting OpenJDK 21 LTS with low memory footprint
# ==============================================================================

# Stage 1: Maven Build
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compile and package production JAR
COPY src ./src
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
COPY --from=build /workspace/target/samvaad-backend-0.0.1-SNAPSHOT.jar app.jar

# Render dynamically sets $PORT (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Execute Spring Boot with container-aware memory flags
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
