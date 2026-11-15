package br.com.chfb.imoveis.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.moderation.entity.Gravidade;

public interface GravidadeRepository extends JpaRepository<Gravidade, Long> {

    List<Gravidade> findAllByOrderByOrdemAscNomeAsc();

    boolean existsByNomeNormalizadoAndIdNot(String nomeNormalizado, Long id);

    boolean existsByNomeNormalizado(String nomeNormalizado);
}
