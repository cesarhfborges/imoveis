package br.com.chfb.imoveis.listing.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.listing.entity.Contato;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    @EntityGraph(attributePaths = "imovel")
    Page<Contato> findByImovelAnuncianteIdOrderByCriadoEmDesc(Long anuncianteId, Pageable pageable);

    long countByImovelAnuncianteIdAndLidoFalse(Long anuncianteId);

    void deleteByImovelId(Long imovelId);

    /** Contatos que a pessoa enviou a anunciantes (exclusão de conta). */
    void deleteByUsuarioId(Long usuarioId);
}
