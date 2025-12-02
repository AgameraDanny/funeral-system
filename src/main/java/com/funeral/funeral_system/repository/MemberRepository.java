package com.funeral.funeral_system.repository;

import com.funeral.funeral_system.entity.Member;
import com.funeral.funeral_system.entity.Society;
import com.funeral.funeral_system.entity.Funeral;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface MemberRepository extends JpaRepository<Member, Long> {
	Optional<Member> findByIdNumber(String idNumber);
}