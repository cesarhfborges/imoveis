package br.com.chfb.imoveis.listing.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.listing.entity.StatusVisita;
import br.com.chfb.imoveis.listing.entity.Visita;

public interface VisitaRepository extends JpaRepository<Visita, Long> {

    /** Visitas pedidas pelo cliente (as mais próximas/recentes primeiro). */
    @EntityGraph(attributePaths = "imovel")
    List<Visita> findByClienteIdOrderByInicioDesc(Long clienteId);

    /** Visitas aos anúncios do anunciante. */
    @EntityGraph(attributePaths = "imovel")
    List<Visita> findByImovelAnuncianteIdOrderByInicioDesc(Long anuncianteId);

    /**
     * Horários já tomados entre {@code de} e {@code ate}: visitas em andamento do imóvel e visitas confirmadas de
     * qualquer anúncio do mesmo anunciante (ele não pode estar em dois lugares).
     */
    @Query("""
            select v.inicio from Visita v
            where v.inicio >= :de and v.inicio < :ate
              and ((v.imovel.id = :imovel and v.status in :andamento)
                   or (v.imovel.anuncianteId = :anunciante and v.status = br.com.chfb.imoveis.listing.entity.StatusVisita.CONFIRMADA))
            """)
    List<Instant> ocupados(@Param("imovel") Long imovelId, @Param("anunciante") Long anuncianteId,
            @Param("de") Instant de, @Param("ate") Instant ate, @Param("andamento") Collection<StatusVisita> andamento);

    boolean existsByImovelIdAndClienteIdAndStatusIn(Long imovelId, Long clienteId, Collection<StatusVisita> status);

    long countByImovelAnuncianteIdAndStatus(Long anuncianteId, StatusVisita status);
}
