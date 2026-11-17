package br.com.chfb.imoveis.moderation.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import br.com.chfb.imoveis.moderation.entity.Denuncia;
import br.com.chfb.imoveis.moderation.entity.StatusDenuncia;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;

public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    List<Denuncia> findByImovelIdOrderByCriadoEmAsc(Long imovelId);

    List<Denuncia> findByImovelIdAndStatusIn(Long imovelId, Collection<StatusDenuncia> status);

    boolean existsByImovelIdAndStatusIn(Long imovelId, Collection<StatusDenuncia> status);

    boolean existsByImovelIdAndDenuncianteIdAndTipoIdAndStatusIn(Long imovelId, Long denuncianteId, Long tipoId,
            Collection<StatusDenuncia> status);

    List<Denuncia> findByDenuncianteIdOrderByCriadoEmDesc(Long denuncianteId);

    long countByStatus(StatusDenuncia status);

    long countByStatusIn(Collection<StatusDenuncia> status);

    boolean existsByTipoId(Long tipoId);

    boolean existsByGravidadeId(Long gravidadeId);

    /**
     * Denúncias julgadas procedentes dos anúncios de um anunciante (encerradas ou com correção pendente), para o
     * histórico e o banimento automático (que conta só as com strike).
     */
    @Query("""
            select d from Denuncia d where d.natureza is not null
              and d.imovelId in (select i.id from Imovel i where i.anuncianteId = :anunciante)
            """)
    List<Denuncia> procedentesDoAnunciante(@Param("anunciante") Long anuncianteId);

    /** Apurações com prazo interno (para o alerta da moderação). */
    @Query("select d.id from Denuncia d where d.status = :status and d.apuracaoPrazoEm is not null and d.apuracaoAvisoEnviado = false")
    List<Long> apuracoesComPrazo(@Param("status") StatusDenuncia status);

    void deleteByImovelId(Long imovelId);

    /** Exclusão de conta (LGPD): tira o vínculo das denúncias que a pessoa fez. */
    @Modifying
    @Query(value = "update denuncias set denunciante_id = null where denunciante_id = :usuario", nativeQuery = true)
    int anonimizarDenunciante(@Param("usuario") Long usuarioId);

    /** Exclusão de conta (LGPD): mensagens da pessoa ficam sem autor e sem os anexos dela (que são apagados). */
    @Modifying
    @Query(value = "update denuncia_mensagens set autor_id = null, anexos = null where autor_id = :usuario", nativeQuery = true)
    int anonimizarMensagens(@Param("usuario") Long usuarioId);

    /** Ids dos anúncios com denúncias nos status informados, do mais recente para o mais antigo. */
    @Query("""
            select d.imovelId from Denuncia d where d.status in :status
            group by d.imovelId order by max(d.criadoEm) desc
            """)
    List<Long> imoveisComStatus(@Param("status") Collection<StatusDenuncia> status);

    /** Ids dos anúncios (de um anunciante) com denúncias nos status informados. */
    @Query("""
            select d.imovelId from Denuncia d where d.status in :status
              and d.imovelId in (select i.id from Imovel i where i.anuncianteId = :anunciante)
            group by d.imovelId order by max(d.criadoEm) desc
            """)
    List<Long> imoveisDoAnuncianteComStatus(@Param("anunciante") Long anuncianteId,
            @Param("status") Collection<StatusDenuncia> status);

    List<Denuncia> findByImovelIdInOrderByCriadoEmAsc(Collection<Long> imovelIds);

    /** Denúncias com prazo correndo (para a tarefa agendada). */
    @Query("select d.id from Denuncia d where d.status = :status and d.prazoEm is not null")
    List<Long> comPrazo(@Param("status") StatusDenuncia status);

    /** Trava a denúncia para a automação; se outra instância já estiver com ela, pula (SKIP LOCKED). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("select d from Denuncia d where d.id = :id")
    Optional<Denuncia> travar(@Param("id") Long id);

    /** Histórico do anunciante: quantas denúncias dos anúncios dele terminaram em cada status. */
    @Query("""
            select d.status, count(d) from Denuncia d
            where d.imovelId in (select i.id from Imovel i where i.anuncianteId = :anunciante)
            group by d.status
            """)
    List<Object[]> historicoDoAnunciante(@Param("anunciante") Long anuncianteId);
}
