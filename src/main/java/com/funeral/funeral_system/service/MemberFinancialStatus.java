package com.funeral.funeral_system.service;
import com.funeral.funeral_system.entity.Payment;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class MemberFinancialStatus {
    private BigDecimal monthlyPremium;
    private BigDecimal totalExpected;   // Should have paid this much since joining
    private BigDecimal totalPaid;       // Actually paid this much
    private BigDecimal outstandingDues; // The difference (Arrears)
    private String statusMessage;       // "Up to Date" or "In Arrears"
    private List<Payment> history;
}