package com.funeral.system.controller;

import com.funeral.system.model.Contribution;
import com.funeral.system.model.Funeral;
import com.funeral.system.model.Member;
import com.funeral.system.model.Society;
import com.funeral.system.repository.ContributionRepository; 
import com.funeral.system.repository.MemberRepository;
import com.funeral.system.repository.SocietyRepository;
import com.funeral.system.service.FinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.funeral.system.dto.FuneralRequest;
import com.funeral.system.repository.FuneralRepository;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*") // Allow frontend to access
public class AdminController {

    @Autowired private FinanceService financeService;
    @Autowired private SocietyRepository societyRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private FuneralRepository funeralRepository; 
    @Autowired private ContributionRepository contributionRepository; 

    // --- SOCIETY MANAGEMENT ---
    
    @PostMapping("/society")
    public Society createSociety(@RequestBody Society society) {
        return societyRepository.save(society);
    }

    @GetMapping("/societies")
    public List<Society> getAllSocieties() {
        return societyRepository.findAll();
    }

    // --- UPDATE SOCIETY (For adding Account Numbers to existing records) ---
    @PutMapping("/society/{id}")
    public Society updateSociety(@PathVariable Long id, @RequestBody Society societyDetails) {
        Society society = societyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Society not found"));
        
        society.setName(societyDetails.getName());
        society.setAccountNumber(societyDetails.getAccountNumber());
        // We do not update balance here manually to prevent fraud
        
        return societyRepository.save(society);
    }

    // --- MEMBER MANAGEMENT ---

    @PostMapping("/member")
    public Member addMember(@RequestBody Member member) {
        // Ensure if it's a beneficiary, the primary member exists
        if(member.getMemberType().name().equals("BENEFICIARY") && member.getPrimaryMember() == null) {
            throw new RuntimeException("Beneficiary must be linked to a Primary Member");
        }
        return memberRepository.save(member);
    }


    @PostMapping("/contribution")
    public ResponseEntity<?> payContribution(@RequestParam Long memberId, 
                                             @RequestParam BigDecimal amount, 
                                             @RequestParam String notes,
                                             @RequestParam String paymentMethod) { // ADD THIS
        
        Contribution c = financeService.recordContribution(memberId, amount, notes, paymentMethod);
        return ResponseEntity.ok(c);
    }

    // --- NEW ENDPOINT: GET SOCIETY CONTRIBUTIONS ---
    @GetMapping("/contributions/society/{societyId}")
    public List<Contribution> getSocietyContributions(@PathVariable Long societyId) {
        return contributionRepository.findBySocietyId(societyId);
    }

    // --- FINANCE: FUNERALS ---

     @PostMapping("/funeral")
    public ResponseEntity<?> logFuneral(@RequestBody FuneralRequest request) {
        Funeral f = financeService.recordFuneral(request);
        return ResponseEntity.ok(f);
    }

    // --- NEW ENDPOINT: GET ALL FUNERALS ---
    @GetMapping("/funerals")
    public List<Funeral> getAllFunerals() {
        // Returns all funerals, automatically including the list of expenses due to JPA
        return funeralRepository.findAll();
    }

    // --- UPDATE FUNERAL (For editing logistics/bio data) ---
    @PutMapping("/funeral/{id}")
    public ResponseEntity<?> updateFuneral(@PathVariable Long id, @RequestBody FuneralRequest request) {
        // We will delegate to a new service method
        Funeral f = financeService.updateFuneralDetails(id, request);
        return ResponseEntity.ok(f);
    }

    // --- POLICY LOGIC ---
    @GetMapping("/policy-cover")
    public BigDecimal getPolicyCover(@RequestParam String plan) {
        // Hardcoded logic based 
        switch (plan.toUpperCase()) {
            // Essential Covers (Image 5)
            case "PLAN A": return new BigDecimal("10000");
            case "PLAN B": return new BigDecimal("20000");
            case "PLAN C": return new BigDecimal("30000");
            case "PLAN D": return new BigDecimal("40000");
            
            // Group Scheme (Image 3)
            case "BRONZE": return new BigDecimal("15000"); // Example value
            case "SILVER": return new BigDecimal("20000");
            case "GOLD":   return new BigDecimal("30000");
            
            default: return BigDecimal.ZERO;
        }
    }

    @DeleteMapping("/member/{id}")
    public ResponseEntity<?> deleteMember(@PathVariable Long id) {
        try {
            memberRepository.deleteById(id);
            return ResponseEntity.ok("Member deleted");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Cannot delete member (might have linked records)");
        }
    }

    @DeleteMapping("/funeral/{id}")
    public ResponseEntity<?> deleteFuneral(@PathVariable Long id) {
        funeralRepository.deleteById(id);
        return ResponseEntity.ok("Funeral record deleted");
    }

    @DeleteMapping("/contribution/{id}")
    public ResponseEntity<?> deleteContribution(@PathVariable Long id) {
        // We must also reverse the balance effect on the Society
        Contribution c = contributionRepository.findById(id).orElseThrow();
        Society s = c.getSociety();
        s.setCurrentBalance(s.getCurrentBalance().subtract(c.getAmount()));
        societyRepository.save(s);
        
        contributionRepository.delete(c);
        return ResponseEntity.ok("Contribution deleted and balance adjusted");
    }
}