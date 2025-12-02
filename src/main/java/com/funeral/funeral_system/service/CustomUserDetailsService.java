package com.funeral.funeral_system.service;

import com.funeral.funeral_system.entity.Member;
import com.funeral.funeral_system.entity.SystemUser;
import com.funeral.funeral_system.repository.MemberRepository;
import com.funeral.funeral_system.repository.SystemUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired private SystemUserRepository systemUserRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private PasswordEncoder passwordEncoder; // Add this

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. System User
        Optional<SystemUser> sysUser = systemUserRepository.findByUsername(username);
        if (sysUser.isPresent()) {
            return User.builder()
                    .username(sysUser.get().getUsername())
                    .password(sysUser.get().getPassword())
                    .roles(sysUser.get().getRole())
                    .build();
        }

        // 2. Member
        Member member = memberRepository.findAll().stream()
                .filter(m -> m.getIdNumber().equals(username))
                .findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // FIX: Handle Null Password safely
        String pass = member.getPassword();
        if (pass == null || pass.isEmpty()) {
            // Assign a default encrypted password if missing (e.g. their ID)
            pass = passwordEncoder.encode(member.getIdNumber());
            // Optionally save it back so it's fixed in DB:
            // member.setPassword(pass);
            // memberRepository.save(member);
        }

        return User.builder()
                .username(member.getIdNumber())
                .password(pass)
                .roles("MEMBER")
                .build();
    }
}