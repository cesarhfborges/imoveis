package br.com.chfb.imoveis.coreapi.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.coreapi.entity.ApiToken;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Long> {

    @EntityGraph(attributePaths = "usuario")
    Optional<ApiToken> findByTokenHash(String tokenHash);

    List<ApiToken> findByUsuarioIdAndRevogadoFalseOrderByCriadoEmDesc(Long usuarioId);
}
