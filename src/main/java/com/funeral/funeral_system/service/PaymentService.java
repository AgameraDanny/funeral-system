package com.funeral.funeral_system.service;

import com.funeral.funeral_system.entity.*;
import com.funeral.funeral_system.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PaymentService {

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private MemberRepository memberRepository;

    // 1. Record a Payment
    public Payment recordPayment(Long memberId, BigDecimal amount, String username) {
        Member member = memberRepository.findById(memberId).orElseThrow();
        
        Payment p = new Payment();
        p.setMember(member);
        p.setAmount(amount);
        p.setPaymentDate(LocalDate.now());
        p.setRecordedBy(username);
        
        return paymentRepository.save(p);
    }

    // 2. Get Financial Status (History + Calculations)
    public MemberFinancialStatus getStatus(Long memberId) {
        Member member = memberRepository.findById(memberId).orElseThrow();
        List<Payment> history = paymentRepository.findByMemberId(memberId);
        
        MemberFinancialStatus status = new MemberFinancialStatus();
        status.setHistory(history);
        
        // Safety: Check if Society exists
        if(member.getSociety() == null) {
            status.setStatusMessage("No Plan Assigned");
            return status;
        }

        // --- FIX STARTS HERE ---
        BigDecimal premium = member.getSociety().getMonthlyPremium();
        
        // If premium is NULL (old data), default to 0 to prevent crash
        if(premium == null) {
            premium = BigDecimal.ZERO; 
        }
        // -----------------------

        status.setMonthlyPremium(premium);

        // Calculate Months Joined
        LocalDate joined = member.getJoiningDate();
        if(joined == null) joined = LocalDate.now();
        
        long monthsJoined = ChronoUnit.MONTHS.between(joined.withDayOfMonth(1), LocalDate.now().withDayOfMonth(1)) + 1;
        
        BigDecimal expected = premium.multiply(new BigDecimal(monthsJoined));
        
        BigDecimal paid = history.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        status.setTotalExpected(expected);
        status.setTotalPaid(paid);
        
        BigDecimal outstanding = expected.subtract(paid);
        status.setOutstandingDues(outstanding);
        
        if(outstanding.compareTo(BigDecimal.ZERO) > 0) {
            status.setStatusMessage("OWING: R " + outstanding);
        } else {
            status.setStatusMessage("UP TO DATE");
        }
        
        return status;
    }
}