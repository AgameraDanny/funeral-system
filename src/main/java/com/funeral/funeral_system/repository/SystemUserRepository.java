// SystemUserRepository.java
package com.funeral.funeral_system.repository;
import com.funeral.funeral_system.entity.SystemUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SystemUserRepository extends JpaRepository<SystemUser, Long> {
    Optional<SystemUser> findByUsername(String username);
}

// Ensure MemberRepository has this:
// Optional<Member> findByIdNumber(String idNumber);