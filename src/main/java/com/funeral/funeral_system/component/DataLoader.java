package com.funeral.funeral_system.component;

import com.funeral.funeral_system.entity.*;
import com.funeral.funeral_system.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.List;

import java.math.BigDecimal;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired private SocietyRepository societyRepository;
    @Autowired private CatalogueItemRepository itemRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private SystemUserRepository systemUserRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        
        // ==========================================
        // 1. CREATE DEFAULT USERS (If they don't exist)
        // ==========================================

        // HEAD OFFICE ADMIN
        if (systemUserRepository.findByUsername("admin").isEmpty()) {
            SystemUser admin = new SystemUser();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123")); // <--- PASSWORD HERE
            admin.setRole("ROLE_ADMIN");
            systemUserRepository.save(admin);
            System.out.println("✅ ADMIN USER CREATED: admin / admin123");
        }

        // SATELLITE BRANCH
        if (systemUserRepository.findByUsername("satellite").isEmpty()) {
            SystemUser branch = new SystemUser();
            branch.setUsername("satellite");
            branch.setPassword(passwordEncoder.encode("branch123"));
            branch.setRole("ROLE_USER");
            systemUserRepository.save(branch);
            System.out.println("✅ BRANCH USER CREATED: satellite / branch123");
        }
        
        // OWNER
        if (systemUserRepository.findByUsername("owner").isEmpty()) {
            SystemUser owner = new SystemUser();
            owner.setUsername("owner");
            owner.setPassword(passwordEncoder.encode("owner123"));
            owner.setRole("ROLE_ADMIN");
            systemUserRepository.save(owner);
        }

        // FIX MISSING PREMIUMS (For existing data)
        List<Society> allSocieties = societyRepository.findAll();
        for (Society s : allSocieties) {
            if (s.getMonthlyPremium() == null) {
                // Assign defaults based on name or arbitrary value
                if (s.getName().contains("Plan A")) s.setMonthlyPremium(new BigDecimal("200"));
                else if (s.getName().contains("Plan B")) s.setMonthlyPremium(new BigDecimal("150"));
                else s.setMonthlyPremium(new BigDecimal("100"));
                
                societyRepository.save(s);
                System.out.println("✅ Fixed missing premium for: " + s.getName());
            }
        }

        // ==========================================
        // 2. CREATE SOCIETIES (PLANS)
        // ==========================================
        if (societyRepository.count() == 0) {
            // Plan Name, Cover, Cost
            createSociety("Plan A (Premier)", new BigDecimal("20000"), new BigDecimal("200"));
            Society planB = createSociety("Plan B (Standard)", new BigDecimal("15000"), new BigDecimal("150"));
            createSociety("Plan C (Basic)", new BigDecimal("10000"), new BigDecimal("100"));

            // Create a Dummy Member for Testing
            if (memberRepository.count() == 0) {
                Member m = new Member();
                m.setFirstName("Juma");
                m.setLastName("Hassan");
                m.setIdNumber("12345678");
                m.setPhoneNumber("0712345678");
                m.setStatus(Member.MemberStatus.ACTIVE);
                m.setSociety(planB);
                m.setJoiningDate(java.time.LocalDate.now().minusMonths(3)); 
                // Member login: ID as username, ID as password
                m.setPassword(passwordEncoder.encode("12345678")); 
                memberRepository.save(m);
            }
        }

        // ==========================================
        // 3. CREATE CATALOGUE (PRICE LIST)
        // ==========================================
        if (itemRepository.count() == 0) {
            // Caskets
            createItem("Round Casket", "Caskets", new BigDecimal("8500"));
            createItem("Half View Casket", "Caskets", new BigDecimal("4500"));
            createItem("Standard Dome", "Caskets", new BigDecimal("6000"));
            
            // Transport
            createItem("Hearse", "Transport", new BigDecimal("2500"));
            createItem("Family Car", "Transport", new BigDecimal("1500"));
            createItem("Transport (Local)", "Transport", new BigDecimal("800"));
            
            // Accessories
            createItem("Tent Package", "Accessories", new BigDecimal("1200"));
            createItem("Fresh Flowers", "Accessories", new BigDecimal("800"));
            createItem("Grave Marker", "Accessories", new BigDecimal("350"));
            createItem("Programs (100)", "Stationery", new BigDecimal("450"));
        }
    }

    private Society createSociety(String name, BigDecimal coverage, BigDecimal premium) {
        Society s = new Society();
        s.setName(name);
        s.setCoverageAmount(coverage);
        s.setMonthlyPremium(premium); // <--- Set Cost
        return societyRepository.save(s);
    }

    private void createItem(String name, String cat, BigDecimal price) {
        CatalogueItem i = new CatalogueItem();
        i.setName(name);
        i.setCategory(cat);
        i.setPrice(price);
        itemRepository.save(i);
    }
}