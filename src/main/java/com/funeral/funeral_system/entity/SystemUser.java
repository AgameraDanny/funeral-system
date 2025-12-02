package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class SystemUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true)
    private String username;
    private String password;
    private String role; // ADMIN, USER
}