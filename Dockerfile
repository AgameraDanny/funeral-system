# Stage 1: Build the application
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the app and skip tests to speed up deployment
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jdk-slim
WORKDIR /app
# Copy the built jar from the previous stage
COPY --from=build /app/target/funeral-system-0.0.1-SNAPSHOT.jar app.jar

# Expose the port (Render handles mapping, but this is good practice)
EXPOSE 8080

# Command to run the app
ENTRYPOINT ["java", "-jar", "app.jar"]