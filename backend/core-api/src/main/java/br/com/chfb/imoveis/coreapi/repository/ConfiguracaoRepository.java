package br.com.chfb.imoveis.coreapi.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.coreapi.entity.Configuracao;

public interface ConfiguracaoRepository extends JpaRepository<Configuracao, Long> {

    Optional<Configuracao> findFirstByOrderByIdAsc();
}
