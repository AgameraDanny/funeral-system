package com.funeral.system.service;

import com.funeral.system.model.*;
import com.funeral.system.model.enums.MemberType;
import com.funeral.system.repository.*;
import com.funeral.system.dto.FuneralRequest;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

        // Calculate Total Cost
        BigDecimal totalCost = BigDecimal.ZERO;
        if (request.getItems() != null) {
            for (FuneralRequest.ExpenseItem item : request.getItems()) {
                if (item.getCost() != null) {
                    totalCost = totalCost.add(item.getCost());
                }
            }
        }

        // Verify Balance
        BigDecimal balanceBefore = society.getCurrentBalance();
        BigDecimal societyContribution = request.getSocietyPays() != null ? request.getSocietyPays() : BigDecimal.ZERO;

        if (balanceBefore.compareTo(societyContribution) < 0) {
            throw new RuntimeException("Insufficient Society Funds. Balance: " + balanceBefore);
        }

        // Deduct from Society
        BigDecimal balanceAfter = balanceBefore.subtract(societyContribution);
        society.setCurrentBalance(balanceAfter);
        societyRepository.save(society);

        // Update Member Bio Data (if provided in form)
        if (request.getSex() != null && !request.getSex().isEmpty()) {
            member.setSex(request.getSex());
        }
        if (request.getDateOfBirth() != null) {
            member.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getAddress() != null && !request.getAddress().isEmpty()) {
            member.setAddress(request.getAddress());
        }

        member.setDeceased(true);
        member.setDateOfDeath(request.getDateOfDeath() != null ? request.getDateOfDeath() : LocalDate.now());
        memberRepository.save(member);

        // Create Funeral Record
        Funeral funeral = new Funeral();
        funeral.setDeceasedMember(member);
        funeral.setSociety(society);
        funeral.setTotalCost(totalCost);
        funeral.setPaidBySociety(societyContribution);
        funeral.setPaidByFamily(totalCost.subtract(societyContribution));
        
        // --- MAP NEW FIELDS ---
        funeral.setBranchCode(request.getBranchCode());
        funeral.setCountryOfBirth(request.getCountryOfBirth());
        funeral.setOccupation(request.getOccupation());
        funeral.setMaritalStatus(request.getMaritalStatus());
        funeral.setReligion(request.getReligion());
        funeral.setMinister(request.getMinister());
        funeral.setDoctorName(request.getDoctorName());
        funeral.setNextOfKin(request.getNextOfKin());
        funeral.setFuneralVenue(request.getFuneralVenue());
        funeral.setPlaceOfDeath(request.getPlaceOfDeath());
        funeral.setPlaceOfBurial(request.getPlaceOfBurial());
        funeral.setCauseOfDeath(request.getCauseOfDeath());
        funeral.setDateOfDeath(request.getDateOfDeath());
        
        // Handle Funeral Date/Time
        if(request.getDateOfBurial() != null) {
            funeral.setFuneralDate(request.getDateOfBurial().atStartOfDay());
        } else {
            funeral.setFuneralDate(LocalDateTime.now().plusDays(3));
        }
        funeral.setTimeOfBurial(request.getTimeOfBurial());

        funeral.setGraveNumber(request.getGraveNo());
        funeral.setGraveType(request.getGraveType());
        funeral.setCemetery(request.getCemetery());
        funeral.setHearseRequired(request.isHearseRequired());
        funeral.setMournersCarRequired(request.isMournersCarRequired());
        funeral.setSpecialInstructions(request.getInstructions());
        
        funeral.setSocietyBalanceBefore(balanceBefore);
        funeral.setSocietyBalanceAfter(balanceAfter);

        Funeral savedFuneral = funeralRepository.save(funeral);

        // Save Expenses
        if (request.getItems() != null) {
            for (FuneralRequest.ExpenseItem item : request.getItems()) {
                FuneralExpense expense = new FuneralExpense();
                expense.setItemName(item.getName());
                expense.setCost(item.getCost());
                expense.setFuneral(savedFuneral);
                expenseRepository.save(expense);
            }
        }

        return savedFuneral;
    }

    @Transactional
    public Funeral updateFuneralDetails(Long id, FuneralRequest request) {
        Funeral funeral = funeralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Funeral not found"));

        // Update Bio & Logistics only
        funeral.setBranchCode(request.getBranchCode());
        funeral.setCountryOfBirth(request.getCountryOfBirth());
        funeral.setOccupation(request.getOccupation());
        funeral.setMaritalStatus(request.getMaritalStatus());
        funeral.setReligion(request.getReligion());
        funeral.setMinister(request.getMinister());
        funeral.setDoctorName(request.getDoctorName());
        funeral.setNextOfKin(request.getNextOfKin());
        funeral.setFuneralVenue(request.getFuneralVenue());
        funeral.setPlaceOfDeath(request.getPlaceOfDeath());
        funeral.setPlaceOfBurial(request.getPlaceOfBurial());
        funeral.setCauseOfDeath(request.getCauseOfDeath());
        
        if (request.getDateOfDeath() != null) funeral.setDateOfDeath(request.getDateOfDeath());
        if (request.getDateOfBurial() != null) funeral.setFuneralDate(request.getDateOfBurial().atStartOfDay());
        
        funeral.setTimeOfBurial(request.getTimeOfBurial());
        funeral.setGraveNumber(request.getGraveNo());
        funeral.setGraveType(request.getGraveType());
        funeral.setCemetery(request.getCemetery());
        funeral.setHearseRequired(request.isHearseRequired());
        funeral.setMournersCarRequired(request.isMournersCarRequired());
        funeral.setSpecialInstructions(request.getInstructions());

        return funeralRepository.save(funeral);
    }
}