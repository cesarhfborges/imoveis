package br.com.chfb.imoveis.platform.notificacao;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    Page<Notificacao> findByUsuarioIdOrderByCriadoEmDesc(Long usuarioId, Pageable pageable);

    Page<Notificacao> findByUsuarioIdAndLidaEmIsNullOrderByCriadoEmDesc(Long usuarioId, Pageable pageable);

    long countByUsuarioIdAndLidaEmIsNull(Long usuarioId);

    Optional<Notificacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    @Modifying
    @Query("update Notificacao n set n.lidaEm = :agora where n.usuarioId = :usuario and n.lidaEm is null")
    int marcarTodasLidas(@Param("usuario") Long usuarioId, @Param("agora") Instant agora);

    @Modifying
    @Query("delete from Notificacao n where n.usuarioId = :usuario and n.lidaEm is not null")
    int apagarLidas(@Param("usuario") Long usuarioId);
}
