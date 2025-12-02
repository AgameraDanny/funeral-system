package com.funeral.funeral_system.controller;

import com.funeral.funeral_system.entity.*;
import com.funeral.funeral_system.repository.*;
import com.funeral.funeral_system.service.FuneralService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class FuneralController {

    @Autowired private FuneralService funeralService;
    @Autowired private FuneralRepository funeralRepository;
    @Autowired private CatalogueItemRepository itemRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private SocietyRepository societyRepository; 
    @Autowired private SystemUserRepository systemUserRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private com.funeral.funeral_system.service.PaymentService paymentService;

    // ===========================
    // USER & AUTH
    // ===========================
    @GetMapping("/me")
    public String getCurrentUser(java.security.Principal principal) {
        return principal.getName();
    }

    @PostMapping("/change-password")
    public void changePassword(@RequestParam String newPassword, java.security.Principal principal) {
        String username = principal.getName();
        // Try System User
        var sysUser = systemUserRepository.findByUsername(username);
        if(sysUser.isPresent()) {
            var u = sysUser.get();
            u.setPassword(passwordEncoder.encode(newPassword));
            systemUserRepository.save(u);
            return;
        }
        // Try Member
        var m = memberRepository.findAll().stream()
                .filter(mem -> mem.getIdNumber().equals(username))
                .findFirst().orElseThrow();
        m.setPassword(passwordEncoder.encode(newPassword));
        memberRepository.save(m);
    }

    // ===========================
    // MEMBERS
    // ===========================
    @GetMapping("/members")
    public List<Member> getAllMembers() {
        return memberRepository.findAll();
    }

    @PostMapping("/admin/members")
    public Member createMember(@RequestBody Member member) {
        // Set default password = ID Number
        member.setPassword(passwordEncoder.encode(member.getIdNumber()));
        member.setStatus(Member.MemberStatus.ACTIVE);
        return memberRepository.save(member);
    }

    @DeleteMapping("/admin/members/{id}")
    public void deleteMember(@PathVariable Long id) {
        memberRepository.deleteById(id);
    }

    @PutMapping("/admin/members/{id}/status")
    public Member updateStatus(@PathVariable Long id, @RequestParam Member.MemberStatus status) {
        Member m = memberRepository.findById(id).orElseThrow();
        m.setStatus(status);
        return memberRepository.save(m);
    }

    // ===========================
    // SOCIETIES (PLANS) - NEW!
    // ===========================
    
    // 1. Get All (Fixes the Loading... issue)
    @GetMapping("/societies")
    public List<Society> getAllSocieties() {
        return societyRepository.findAll();
    }

    // 2. Create Society
    @PostMapping("/admin/societies")
    public Society createSociety(@RequestBody Society society) {
        return societyRepository.save(society);
    }

    // 3. Update Society
    @PutMapping("/admin/societies/{id}")
    public Society updateSociety(@PathVariable Long id, @RequestBody Society updated) {
        Society s = societyRepository.findById(id).orElseThrow();
        s.setName(updated.getName());
        s.setCoverageAmount(updated.getCoverageAmount());
        return societyRepository.save(s);
    }

    // 4. Delete Society
    @DeleteMapping("/admin/societies/{id}")
    public void deleteSociety(@PathVariable Long id) {
        // Note: This might fail if members are already linked to this plan.
        // You would need to unlink them first in a real scenario, but for now:
        societyRepository.deleteById(id);
    }

    // ===========================
    // FUNERALS & CATALOGUE
    // ===========================
    @PostMapping("/funeral/start")
    public Funeral startFuneral(@RequestParam Long memberId) {
        return funeralService.initiateFuneral(memberId);
    }

    @GetMapping("/funeral/{id}")
    public Funeral getFuneral(@PathVariable Long id) {
        return funeralRepository.findById(id).orElseThrow();
    }

    @GetMapping("/catalogue")
    public List<CatalogueItem> getCatalogue() {
        return itemRepository.findAll();
    }

    @PostMapping("/funeral/{id}/expense")
    public Funeral addExpense(@PathVariable Long id, 
                              @RequestParam(required = false) Long itemId,
                              @RequestParam(required = false) String manualDesc,
                              @RequestParam(required = false) BigDecimal manualAmount) {
        if (itemId != null) {
            CatalogueItem item = itemRepository.findById(itemId).orElseThrow();
            return funeralService.addExpense(id, item.getName(), item.getPrice());
        } else {
            return funeralService.addExpense(id, manualDesc, manualAmount);
        }
    }

    @DeleteMapping("/funeral/{funeralId}/expense/{expenseId}")
    public Funeral removeExpense(@PathVariable Long funeralId, @PathVariable Long expenseId) {
        return funeralService.removeExpense(funeralId, expenseId);
    }

    // 1. Get Member Finance Status
    @GetMapping("/members/{id}/finance")
    public com.funeral.funeral_system.service.MemberFinancialStatus getFinance(@PathVariable Long id) {
        return paymentService.getStatus(id);
    }

    // 2. Make Payment
    @PostMapping("/members/{id}/payment")
    public Payment makePayment(@PathVariable Long id, 
                               @RequestParam BigDecimal amount, 
                               java.security.Principal principal) {
        return paymentService.recordPayment(id, amount, principal.getName());
    }
}