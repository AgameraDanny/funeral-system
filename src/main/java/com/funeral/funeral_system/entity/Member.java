package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;
    private String idNumber;
    private String phoneNumber;
    @JsonIgnore // <--- HIDE PASSWORD FROM API
    private String password;
    private java.time.LocalDate joiningDate;
    
    // Helper to check if this is an admin (Members are never admins in this logic)
    public boolean isAdmin() { return false; }

    @Enumerated(EnumType.STRING)
    private MemberStatus status; // ACTIVE, DECEASED, LAPSED

    private BigDecimal monthlyContribution;
    
    // Links member to a specific society plan
    @ManyToOne
    @JoinColumn(name = "society_id")
    private Society society;

    public enum MemberStatus {
        ACTIVE, DECEASED, LAPSED
    }
}