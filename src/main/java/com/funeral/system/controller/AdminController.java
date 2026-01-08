package com.funeral.system.controller;

import com.funeral.system.dto.FuneralRequest;
import com.funeral.system.model.*;
import com.funeral.system.repository.*;
import com.funeral.system.service.FinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*") 
public class AdminController {

    @Autowired private SocietyRepository societyRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private FuneralRepository funeralRepository; 
    @Autowired private ContributionRepository contributionRepository; 
    @Autowired private FinanceService financeService;

    // --- SOCIETY MANAGEMENT ---
    
    @PostMapping("/society")
    public Society createSociety(@RequestBody Society society) {
        return societyRepository.save(society);
    }

    @GetMapping("/societies")
    public List<Society> getAllSocieties() {
        return societyRepository.findAll();
    }

    @PutMapping("/society/{id}")
    public Society updateSociety(@PathVariable Long id, @RequestBody Society societyDetails) {
        Society society = societyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Society not found"));
        society.setName(societyDetails.getName());
        society.setAccountNumber(societyDetails.getAccountNumber());
        return societyRepository.save(society);
    }

    // --- MEMBER MANAGEMENT ---

    @PostMapping("/member")
    public Member addMember(@RequestBody Member member) {
        if(member.getMemberType().name().equals("BENEFICIARY") && member.getPrimaryMember() == null) {
            throw new RuntimeException("Beneficiary must be linked to a Primary Member");
        }
        return memberRepository.save(member);
    }

    //Toggle Member Status (Active/Deceased)
    @PutMapping("/member/{id}/status")
    public ResponseEntity<?> toggleMemberStatus(@PathVariable Long id) {
        Member m = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        
        // Toggle status
        m.setDeceased(!m.isDeceased());
        memberRepository.save(m);
        
        return ResponseEntity.ok("Status updated to: " + (m.isDeceased() ? "Deceased" : "Active"));
    }

    // --- POLICY LOGIC ---
    @GetMapping("/policy-cover")
    public BigDecimal getPolicyCover(@RequestParam String plan) {
        if (plan == null) return BigDecimal.ZERO;
        switch (plan.toUpperCase()) {
            case "PLAN A": return new BigDecimal("10000");
            case "PLAN B": return new BigDecimal("20000");
            case "PLAN C": return new BigDecimal("30000");
            case "PLAN D": return new BigDecimal("40000");
            case "BRONZE": return new BigDecimal("15000");
            case "SILVER": return new BigDecimal("20000");
            case "GOLD":   return new BigDecimal("30000");
            default: return BigDecimal.ZERO;
        }
    }

    // --- CONTRIBUTIONS ---

    @PostMapping("/contribution")
    public ResponseEntity<?> payContribution(@RequestParam Long memberId, 
                                             @RequestParam BigDecimal amount, 
                                             @RequestParam String notes,
                                             @RequestParam String paymentMethod) {
        Contribution c = financeService.recordContribution(memberId, amount, notes, paymentMethod);
        return ResponseEntity.ok(c);
    }

    @GetMapping("/contributions/society/{societyId}")
    public List<Contribution> getSocietyContributions(@PathVariable Long societyId) {
        return contributionRepository.findBySocietyId(societyId);
    }

    // --- FUNERALS ---

    @PostMapping("/funeral")
    public ResponseEntity<?> logFuneral(@RequestBody FuneralRequest request) {
        Funeral f = financeService.recordFuneral(request);
        return ResponseEntity.ok(f);
    }

    @GetMapping("/funerals")
    public List<Funeral> getAllFunerals() {
        return funeralRepository.findAll();
    }

    @PutMapping("/funeral/{id}")
    public ResponseEntity<?> updateFuneral(@PathVariable Long id, @RequestBody FuneralRequest request) {
        Funeral f = financeService.updateFuneralDetails(id, request);
        return ResponseEntity.ok(f);
    }

    // --- DELETE / CLEAR DATA ---

    @DeleteMapping("/member/{id}")
    public ResponseEntity<?> deleteMember(@PathVariable Long id) {
        try {
            memberRepository.deleteById(id);
            return ResponseEntity.ok("Member deleted");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Cannot delete member (Check linked records)");
        }
    }

    @DeleteMapping("/funeral/{id}")
    public ResponseEntity<?> deleteFuneral(@PathVariable Long id) {
        funeralRepository.deleteById(id);
        return ResponseEntity.ok("Funeral record deleted");
    }

    @DeleteMapping("/contribution/{id}")
    public ResponseEntity<?> deleteContribution(@PathVariable Long id) {
        Contribution c = contributionRepository.findById(id).orElseThrow();
        Society s = c.getSociety();
        s.setCurrentBalance(s.getCurrentBalance().subtract(c.getAmount()));
        societyRepository.save(s);
        contributionRepository.delete(c);
        return ResponseEntity.ok("Contribution deleted and balance adjusted");
    }
}