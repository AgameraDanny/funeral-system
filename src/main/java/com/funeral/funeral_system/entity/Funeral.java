package com.funeral.funeral_system.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class Funeral {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "member_id")
    private Member deceasedMember;

    private LocalDate dateOfDeath;
    private LocalDate dateOfFuneral;

    // This is the "Budget" derived from the Society
    private BigDecimal totalAllocatedBudget;

    @OneToMany(mappedBy = "funeral", cascade = CascadeType.ALL)
    private List<FuneralExpense> expenses = new ArrayList<>();

    // Logic to calculate remaining budget
    public BigDecimal getRemainingBudget() {
        BigDecimal totalSpent = expenses.stream()
                .map(FuneralExpense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return totalAllocatedBudget.subtract(totalSpent);
    }
}