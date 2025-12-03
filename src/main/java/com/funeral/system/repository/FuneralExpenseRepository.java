package com.funeral.system.repository;
import com.funeral.system.model.FuneralExpense;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FuneralExpenseRepository extends JpaRepository<FuneralExpense, Long> {
}