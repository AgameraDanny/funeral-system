package com.funeral.system.repository;

import com.funeral.system.model.Member;
import com.funeral.system.model.enums.MemberType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    // Find all members belonging to a specific society
    List<Member> findBySocietyId(Long societyId);

    // Find all beneficiaries linked to a specific primary member
    List<Member> findByPrimaryMemberId(Long primaryMemberId);

    // Find only primary members (useful for dropdowns when adding beneficiaries)
    List<Member> findByMemberType(MemberType memberType);
    
    // Find member by ID number (South African ID) to prevent duplicates
    Member findByIdNumber(String idNumber);
}