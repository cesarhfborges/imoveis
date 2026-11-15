package br.com.chfb.imoveis.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.moderation.entity.TipoDenuncia;

public interface TipoDenunciaRepository extends JpaRepository<TipoDenuncia, Long> {

    List<TipoDenuncia> findAllByOrderByOrdemAscNomeAsc();

    List<TipoDenuncia> findByAtivoTrueOrderByOrdemAscNomeAsc();

    boolean existsByGravidadeId(Long gravidadeId);
}
