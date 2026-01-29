package com.funeral.system.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    private BigDecimal totalCost;
    private BigDecimal paidBySociety;
    private BigDecimal paidByFamily;
    private BigDecimal societyBalanceBefore;
    private BigDecimal societyBalanceAfter;

    // --- NEW FIELDS FROM GREEN FORM ---
    private String branchCode;
    private String countryOfBirth; // Default South Africa
    private String occupation;
    private String maritalStatus;
    private String religion;
    private String minister;
    private String doctorName;
    private String nextOfKin;
    private String funeralVenue; // Home/Church
    private String placeOfDeath;
    private String placeOfBurial;
    private String causeOfDeath;
    private String sex;          
    private LocalDate dateOfBirth; 
    private String address;   

    // Dates & Times
    private LocalDateTime funeralDate; // Acts as Date of Burial
    private String timeOfBurial;
    private LocalDate dateOfDeath;

    // Logistics
    private String graveNumber;
    private String graveType; // Ord, etc.
    private String cemetery;

    private boolean hearseRequired;
    private boolean mournersCarRequired;

    @Column(columnDefinition = "TEXT")
    private String specialInstructions; // Used for "Funeral Needs" text or extra notes

    @OneToMany(mappedBy = "funeral", cascade = CascadeType.ALL)
    private List<FuneralExpense> expenses = new ArrayList<>();
}