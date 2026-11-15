package br.com.chfb.imoveis.platform.calendario;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpedienteRepository extends JpaRepository<ExpedienteDia, Short> {

    List<ExpedienteDia> findAllByOrderByDiaSemanaAsc();
}
