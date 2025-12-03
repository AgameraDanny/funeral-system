package com.funeral.system.model;

import com.funeral.system.model.enums.MemberType;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Data
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;
    private String idNumber; // South African ID usually
    private String contactNumber;
    private String address;

    @Enumerated(EnumType.STRING)
    private MemberType memberType; // PRIMARY or BENEFICIARY

    // If this is a beneficiary, who is the primary member responsible?
    @ManyToOne
    @JoinColumn(name = "primary_member_id")
    private Member primaryMember;

    @ManyToOne
    @JoinColumn(name = "society_id")
    @JsonIgnoreProperties("members")
    private Society society;

    private LocalDate dateOfBirth;
    
    // To track if they have passed away
    private boolean isDeceased = false;
    private LocalDate dateOfDeath;
}