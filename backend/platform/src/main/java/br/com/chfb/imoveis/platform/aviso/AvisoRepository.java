package br.com.chfb.imoveis.platform.aviso;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvisoRepository extends JpaRepository<Aviso, Long> {

    List<Aviso> findAllByOrderByOrdemAscIdAsc();

    List<Aviso> findByAtivoTrueOrderByOrdemAscIdAsc();
}
