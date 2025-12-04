package com.funeral.system.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Data
public class Society {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String accountNumber;

    // The current pool of money available for this society
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @OneToMany(mappedBy = "society", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("society") 
    private List<Member> members = new ArrayList<>();
}