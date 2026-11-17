package br.com.chfb.imoveis.listing.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.listing.entity.Contato;
import br.com.chfb.imoveis.listing.entity.EtapaContato;

public interface ContatoRepository extends JpaRepository<Contato, Long> {

    @EntityGraph(attributePaths = "imovel")
    Page<Contato> findByImovelAnuncianteIdOrderByCriadoEmDesc(Long anuncianteId, Pageable pageable);

    @EntityGraph(attributePaths = "imovel")
    Page<Contato> findByImovelAnuncianteIdAndEtapaOrderByCriadoEmDesc(Long anuncianteId, EtapaContato etapa, Pageable pageable);

    /** [etapa, quantidade] dos contatos recebidos pelo anunciante. */
    @Query("select c.etapa, count(c) from Contato c where c.imovel.anuncianteId = :anunciante group by c.etapa")
    List<Object[]> contarPorEtapa(@Param("anunciante") Long anuncianteId);

    long countByImovelAnuncianteIdAndLidoFalse(Long anuncianteId);

    void deleteByImovelId(Long imovelId);

    /** Contatos que a pessoa enviou a anunciantes (exclusão de conta). */
    void deleteByUsuarioId(Long usuarioId);
}
