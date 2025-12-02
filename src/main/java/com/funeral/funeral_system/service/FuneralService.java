package com.funeral.funeral_system.service;

import com.funeral.funeral_system.entity.*;
import com.funeral.funeral_system.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.time.temporal.ChronoUnit; 

@Service
public class FuneralService {

    @Autowired private FuneralRepository funeralRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private FuneralExpenseRepository expenseRepository;
    @Autowired private PaymentService paymentService;

    // STANDARD WAITING PERIOD (Industry Standard)
    private static final int WAITING_PERIOD_MONTHS = 6; 

    public Funeral initiateFuneral(Long memberId) {
        Member member = memberRepository.findById(memberId).orElseThrow();
        
        // 1. CHECK IF FUNERAL ALREADY EXISTS
        Optional<Funeral> existing = funeralRepository.findByDeceasedMember(member);
        if(existing.isPresent()) {
            return existing.get(); // Return the existing one, don't crash!
        }

        // 2. Mark member as Deceased
        member.setStatus(Member.MemberStatus.DECEASED);
        memberRepository.save(member);

        // 3. Create NEW Funeral
        Funeral funeral = new Funeral();
        funeral.setDeceasedMember(member);
        funeral.setDateOfDeath(LocalDate.now());

        // ---------------------------------------------------------
        // WAITING PERIOD CHECK
        // ---------------------------------------------------------
        LocalDate joinDate = member.getJoiningDate();
        if (joinDate == null) joinDate = LocalDate.now(); // Assume joined today if missing

        long monthsActive = ChronoUnit.MONTHS.between(joinDate, LocalDate.now());
        boolean waitingPeriodMet = monthsActive >= WAITING_PERIOD_MONTHS;
        
        /*if(member.getSociety() != null) {
            funeral.setTotalAllocatedBudget(member.getSociety().getCoverageAmount());
        } else {
            funeral.setTotalAllocatedBudget(BigDecimal.ZERO);
        }*/

        if (member.getSociety() != null) {
            if (waitingPeriodMet) {
                // Full Coverage
                funeral.setTotalAllocatedBudget(member.getSociety().getCoverageAmount());
            } else {
                // WAITING PERIOD FAILED -> ZERO BUDGET
                funeral.setTotalAllocatedBudget(BigDecimal.ZERO);
            }
        } else {
            funeral.setTotalAllocatedBudget(BigDecimal.ZERO);
        }

        // Initialize expenses list
        funeral.setExpenses(new java.util.ArrayList<>());

        // A. Add "Waiting Period" Warning if applicable
        if (!waitingPeriodMet) {
            FuneralExpense warning = new FuneralExpense();
            warning.setDescription("⚠️ WAITING PERIOD NOT MET (Active: " + monthsActive + " months)");
            warning.setAmount(BigDecimal.ZERO); // No cost, just a visible notice
            warning.setFuneral(funeral);
            funeral.getExpenses().add(warning);
        }

        // ---------------------------------------------------------
        // Check Arrears and Deduct automatically
        // ---------------------------------------------------------
        MemberFinancialStatus finance = paymentService.getStatus(memberId);
        BigDecimal arrears = finance.getOutstandingDues();

        // If they owe money (greater than 0)
        if (arrears.compareTo(BigDecimal.ZERO) > 0) {
            FuneralExpense arrearsExpense = new FuneralExpense();
            arrearsExpense.setDescription("Outstanding Premiums (Arrears)");
            arrearsExpense.setAmount(arrears);
            arrearsExpense.setFuneral(funeral);
            
            // Add to the list of expenses immediately
            funeral.getExpenses().add(arrearsExpense);
        }
        // ---------------------------------------------------------

        return funeralRepository.save(funeral);
    }

    public Funeral addExpense(Long funeralId, String description, BigDecimal cost) {
        Funeral funeral = funeralRepository.findById(funeralId).orElseThrow();
        
        FuneralExpense expense = new FuneralExpense();
        expense.setDescription(description);
        expense.setAmount(cost);
        expense.setFuneral(funeral);
        
        funeral.getExpenses().add(expense);
        
        return funeralRepository.save(funeral);
    }

    public Funeral removeExpense(Long funeralId, Long expenseId) {
        // 1. Delete the expense
        expenseRepository.deleteById(expenseId);
        
        // 2. Return the updated funeral to refresh the UI
        return funeralRepository.findById(funeralId).orElseThrow();
    }
}