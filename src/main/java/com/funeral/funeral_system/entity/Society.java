package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
public class Society {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // e.g., "Boikanyo Premium Plan"

    private BigDecimal coverageAmount; // The total budget available (e.g., R20000)
    
    private BigDecimal monthlyPremium; // e.g. 150.00 (Cost to member)

    @OneToMany(mappedBy = "society")
    @JsonIgnore // <--- THIS STOPS INFINITE LOOP
    private List<Member> members;
}