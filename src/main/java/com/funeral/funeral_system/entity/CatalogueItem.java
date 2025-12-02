package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Data
public class CatalogueItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;        // e.g. "Round Casket"
    private String category;    // e.g. "Coffins", "Transport"
    private BigDecimal price;   // e.g. 8000.00
}