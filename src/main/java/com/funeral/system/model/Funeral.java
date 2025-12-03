package com.funeral.system.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class Funeral {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "deceased_member_id")
    private Member deceasedMember;

    @ManyToOne
    @JoinColumn(name = "society_id")
    private Society society;

    // Financials
    private BigDecimal totalCost;          // e.g., 15000
    private BigDecimal paidBySociety;      // e.g., 10000 (Deducted from budget)
    private BigDecimal paidByFamily;       // e.g., 5000 (Calculated)

    // Details from the receipt image
    private String graveNumber;
    private String cemetery;
    private LocalDateTime funeralDate;
    private String minister;
    private String coffinType;
    
    @Column(columnDefinition = "TEXT")
    private String specialInstructions; // e.g. "Turn left at Mamelodi Tavern"

    @OneToMany(mappedBy = "funeral", cascade = CascadeType.ALL)
    private List<FuneralExpense> expenses = new ArrayList<>();

    private BigDecimal societyBalanceBefore;
    private BigDecimal societyBalanceAfter;
}