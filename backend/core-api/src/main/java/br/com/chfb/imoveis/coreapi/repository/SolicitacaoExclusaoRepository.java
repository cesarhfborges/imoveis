package br.com.chfb.imoveis.coreapi.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.chfb.imoveis.coreapi.entity.SolicitacaoExclusao;

public interface SolicitacaoExclusaoRepository extends JpaRepository<SolicitacaoExclusao, Long> {

    /** Pedido em andamento (nem cancelado nem executado). */
    Optional<SolicitacaoExclusao> findByUsuarioIdAndCanceladaEmIsNullAndExecutadaEmIsNull(Long usuarioId);

    /** Pedidos em andamento de vários usuários (listagem do admin). */
    List<SolicitacaoExclusao> findByUsuarioIdInAndCanceladaEmIsNullAndExecutadaEmIsNull(Collection<Long> usuarioIds);

    /** Pedidos vencidos, para a tarefa das 03:00. */
    List<SolicitacaoExclusao> findByRemoverEmLessThanEqualAndCanceladaEmIsNullAndExecutadaEmIsNullOrderByRemoverEm(Instant agora);
}
