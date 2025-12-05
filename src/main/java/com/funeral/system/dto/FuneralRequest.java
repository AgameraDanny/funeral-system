package com.funeral.system.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class FuneralRequest {
    private Long memberId;
    private BigDecimal societyPays;
    
    // Financials & Lists
    private List<ExpenseItem> items;

    // New Fields matching Entity
    private String branchCode;
    private String countryOfBirth;
    private String occupation;
    private String maritalStatus;
    private String religion;
    private String minister;
    private String doctorName;
    private String nextOfKin;
    private String funeralVenue;
    private String placeOfDeath;
    private String placeOfBurial;
    private String causeOfDeath;
    
    private LocalDate dateOfDeath;
    private LocalDate dateOfBurial;
    private String timeOfBurial;
    
    private String graveNo;
    private String graveType;
    private String cemetery;
    private boolean hearseRequired;
    private boolean mournersCarRequired;
    private String instructions;

    @Data
    public static class ExpenseItem {
        private String name;
        private BigDecimal cost;
    }
}