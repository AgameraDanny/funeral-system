package com.funeral.system.repository;

import com.funeral.system.model.Funeral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuneralRepository extends JpaRepository<Funeral, Long> {
    // See funeral history for a specific society
    List<Funeral> findBySocietyId(Long societyId);
}