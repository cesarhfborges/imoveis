package br.com.chfb.imoveis.listing.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.listing.entity.Financeira;

public interface FinanceiraRepository extends JpaRepository<Financeira, Long> {

    List<Financeira> findAllByOrderByNomeAsc();

    List<Financeira> findByAtivoTrueOrderByNomeAsc();
}
