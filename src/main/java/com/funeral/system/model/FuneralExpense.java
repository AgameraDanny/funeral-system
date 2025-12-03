package com.funeral.system.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Data
public class FuneralExpense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemName;
    private BigDecimal cost;

    @ManyToOne
    @JoinColumn(name = "funeral_id")
    @JsonIgnore // Prevent infinite loop in JSON
    private Funeral funeral;
}