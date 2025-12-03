package com.funeral.system.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Disable CSRF (Cross-Site Request Forgery) 
            // This is required to allow POST/PUT/DELETE requests from Postman or your simple JS frontend
            .csrf(AbstractHttpConfigurer::disable)

            // 2. Configure URL Authorization
            .authorizeHttpRequests(auth -> auth
                // Allow access to static resources (HTML, CSS, JS)
                .requestMatchers("/", "/index.html", "/style.css", "/script.js", "/favicon.ico").permitAll()
                
                // Allow access to all API endpoints
                .requestMatchers("/api/admin/**").permitAll()
                
                // For any other request, permit it as well (for development ease)
                .anyRequest().permitAll()
            );

        return http.build();
    }
}