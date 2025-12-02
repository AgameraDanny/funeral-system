package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
public class FuneralExpense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description; // e.g., "Round Casket", "Hearse"
    private BigDecimal amount;  // Price

    @ManyToOne
    @JoinColumn(name = "funeral_id")
    @JsonIgnore // <--- THIS STOPS THE INFINITE LOOP
    private Funeral funeral;
}