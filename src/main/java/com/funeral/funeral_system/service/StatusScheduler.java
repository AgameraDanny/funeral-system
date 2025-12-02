package com.funeral.funeral_system.service;

import com.funeral.funeral_system.entity.Member;
import com.funeral.funeral_system.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class StatusScheduler {

    @Autowired private MemberRepository memberRepository;
    @Autowired private PaymentService paymentService;

    // Run every night at midnight (00:00:00)
    // For testing, you can change this to run every minute: @Scheduled(fixedRate = 60000)
    // @Scheduled(fixedRate = 30000)
    @Scheduled(cron = "0 0 0 * * ?") 
    public void checkLapsedPolicies() {
        System.out.println("🌙 Running Nightly Policy Check...");
        
        List<Member> activeMembers = memberRepository.findAll().stream()
                .filter(m -> m.getStatus() == Member.MemberStatus.ACTIVE)
                .toList();

        int lapsedCount = 0;

        for (Member member : activeMembers) {
            // 1. Get Finances
            MemberFinancialStatus status = paymentService.getStatus(member.getId());
            
            BigDecimal premium = status.getMonthlyPremium();
            BigDecimal outstanding = status.getOutstandingDues();

            // Safety: Skip if premium is 0 (free plan or error)
            if (premium.compareTo(BigDecimal.ZERO) == 0) continue;

            // 2. Logic: If owing more than 3 months (3 * Premium)
            BigDecimal limit = premium.multiply(new BigDecimal("3"));
            
            if (outstanding.compareTo(limit) > 0) {
                // 3. Mark as LAPSED
                member.setStatus(Member.MemberStatus.LAPSED);
                memberRepository.save(member);
                lapsedCount++;
                System.out.println("❌ POLICY LAPSED: " + member.getFirstName() + " (Owes R" + outstanding + ")");
            }
        }
        
        System.out.println("✅ Check Complete. " + lapsedCount + " policies lapsed.");
    }
}