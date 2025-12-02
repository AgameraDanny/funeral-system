package com.funeral.funeral_system.repository;
import com.funeral.funeral_system.entity.CatalogueItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CatalogueItemRepository extends JpaRepository<CatalogueItem, Long> {}