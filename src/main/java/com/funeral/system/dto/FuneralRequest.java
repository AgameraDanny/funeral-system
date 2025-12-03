package com.funeral.system.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class FuneralRequest {
    private Long memberId;
    private BigDecimal societyPays;
    private String graveNo;
    private String cemetery;
    private String instructions;
    
    // List of expenses from the frontend
    private List<ExpenseItem> items;

    @Data
    public static class ExpenseItem {
        private String name;
        private BigDecimal cost;
    }
}