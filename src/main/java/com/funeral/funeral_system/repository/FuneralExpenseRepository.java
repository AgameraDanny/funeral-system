package com.funeral.funeral_system.repository;
import com.funeral.funeral_system.entity.FuneralExpense;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FuneralExpenseRepository extends JpaRepository<FuneralExpense, Long> {}