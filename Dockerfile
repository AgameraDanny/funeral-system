# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
# We use the Alpine image as you requested (it is lighter and fixes the 'not found' error)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# === FIX 1: CORRECT JAR NAME ===
# Changed from 'crash-game-backend' to 'funeral-system' to match your pom.xml
COPY --from=build /app/target/funeral-system-0.0.1-SNAPSHOT.jar app.jar

# === FIX 2: CERTIFICATE LOCATION ===
# Based on your 'ls' output earlier, the .pem file is in the ROOT folder, not src/main/resources.
# If you moved it, update this path.
COPY isrgrootx1.pem /app/isrgrootx1.pem

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]