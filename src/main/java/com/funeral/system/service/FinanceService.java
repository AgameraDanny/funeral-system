package com.funeral.system.service;

import com.funeral.system.model.*;
import com.funeral.system.model.enums.MemberType;
import com.funeral.system.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.funeral.system.dto.FuneralRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class FinanceService {

    @Autowired private SocietyRepository societyRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private ContributionRepository contributionRepository;
    @Autowired private FuneralRepository funeralRepository;
    @Autowired private FuneralExpenseRepository expenseRepository;

    // 1. Record a Monthly Contribution
    @Transactional
    public Contribution recordContribution(Long memberId, BigDecimal amount, String notes, String paymentMethod) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (member.getMemberType() != MemberType.PRIMARY) {
            throw new RuntimeException("Only Primary members pay contributions");
        }

        Society society = member.getSociety();

        // Add to society balance
        society.setCurrentBalance(society.getCurrentBalance().add(amount));
        societyRepository.save(society);

        // Record the transaction
        Contribution contribution = new Contribution();
        contribution.setMember(member);
        contribution.setSociety(society);
        contribution.setAmount(amount);
        contribution.setPaymentDate(LocalDateTime.now());
        contribution.setNotes(notes);
        contribution.setPaymentMethod(paymentMethod);

        return contributionRepository.save(contribution);
    }

    // 2. Process a Funeral
    @Transactional
    public Funeral recordFuneral(FuneralRequest request) {
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new RuntimeException("Member not found"));

        Society society = member.getSociety();

        // 1. Calculate Total Cost from Items
        BigDecimal totalCost = BigDecimal.ZERO;
        for (FuneralRequest.ExpenseItem item : request.getItems()) {
            totalCost = totalCost.add(item.getCost());
        }

        // --- CHANGE START ---
        
        // Capture Balance BEFORE
        BigDecimal balanceBefore = society.getCurrentBalance();

        // 2. Check Budget
        if (balanceBefore.compareTo(request.getSocietyPays()) < 0) {
            throw new RuntimeException("Insufficient Society Funds. Balance: " + balanceBefore);
        }

        // 3. Deduct from Society
        BigDecimal balanceAfter = balanceBefore.subtract(request.getSocietyPays());
        society.setCurrentBalance(balanceAfter);
        societyRepository.save(society);

        // --- CHANGE END ---

        // 4. Update Member
        member.setDeceased(true);
        member.setDateOfDeath(LocalDate.now());
        memberRepository.save(member);

        // 5. Create Funeral
        Funeral funeral = new Funeral();
        funeral.setDeceasedMember(member);
        funeral.setSociety(society);
        funeral.setTotalCost(totalCost);
        funeral.setPaidBySociety(request.getSocietyPays());
        funeral.setPaidByFamily(totalCost.subtract(request.getSocietyPays()));
        funeral.setGraveNumber(request.getGraveNo());
        funeral.setCemetery(request.getCemetery());
        funeral.setSpecialInstructions(request.getInstructions());
        funeral.setFuneralDate(LocalDateTime.now().plusDays(3));
        
        // SAVE HISTORY
        funeral.setSocietyBalanceBefore(balanceBefore);
        funeral.setSocietyBalanceAfter(balanceAfter);

        Funeral savedFuneral = funeralRepository.save(funeral);

        // 6. Save Expenses
        for (FuneralRequest.ExpenseItem item : request.getItems()) {
            FuneralExpense expense = new FuneralExpense();
            expense.setItemName(item.getName());
            expense.setCost(item.getCost());
            expense.setFuneral(savedFuneral);
            expenseRepository.save(expense);
        }

        return savedFuneral;
    }
}