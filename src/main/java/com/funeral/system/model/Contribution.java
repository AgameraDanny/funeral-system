package com.funeral.system.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
public class Contribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "member_id")
    private Member member; // The primary member paying

    @ManyToOne
    @JoinColumn(name = "society_id")
    private Society society;

    private BigDecimal amount; // e.g., 100.00
    private LocalDateTime paymentDate;
    
    private String notes; // e.g., "January 2025 Contribution"

    private String paymentMethod; 
}