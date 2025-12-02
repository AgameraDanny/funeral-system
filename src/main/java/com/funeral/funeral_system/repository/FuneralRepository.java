package com.funeral.funeral_system.repository;

import com.funeral.funeral_system.entity.Funeral;
import com.funeral.funeral_system.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FuneralRepository extends JpaRepository<Funeral, Long> {
    // finder method
    Optional<Funeral> findByDeceasedMember(Member deceasedMember);
}