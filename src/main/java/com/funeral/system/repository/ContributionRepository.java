package com.funeral.system.repository;

import com.funeral.system.model.Contribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContributionRepository extends JpaRepository<Contribution, Long> {
    // See payment history for a specific member
    List<Contribution> findByMemberId(Long memberId);

    // See all income for a specific society
    List<Contribution> findBySocietyId(Long societyId);
}