package br.com.chfb.imoveis.platform.calendario;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FeriadoRepository extends JpaRepository<Feriado, Long> {

    List<Feriado> findAllByOrderByInicioAsc();
}
