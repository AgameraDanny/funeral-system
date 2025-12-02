package com.funeral.funeral_system.repository;

import com.funeral.funeral_system.entity.Member;
import com.funeral.funeral_system.entity.Society;
import com.funeral.funeral_system.entity.Funeral;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocietyRepository extends JpaRepository<Society, Long> {}
