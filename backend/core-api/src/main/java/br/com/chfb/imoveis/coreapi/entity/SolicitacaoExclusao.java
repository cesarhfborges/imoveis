package br.com.chfb.imoveis.coreapi.entity;

import java.time.Instant;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Pedido do próprio usuário para remover a conta (LGPD). Fica pendente até {@code removerEm}; a tarefa das 03:00
 * apaga a conta e marca {@code executadaEm}. Desistir marca {@code canceladaEm} (exclusão lógica do pedido).
 * Guarda só o id do usuário, sem chave estrangeira: o registro sobrevive à conta como prova do atendimento.
 */
@Entity
@Table(name = "solicitacoes_exclusao_conta")
public class SolicitacaoExclusao extends BaseEntity {

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    @Column(name = "remover_em", nullable = false)
    private Instant removerEm;

    @Column(name = "cancelada_em")
    private Instant canceladaEm;

    @Column(name = "executada_em")
    private Instant executadaEm;

    protected SolicitacaoExclusao() {
    }

    public SolicitacaoExclusao(Long usuarioId, Instant removerEm) {
        this.usuarioId = usuarioId;
        this.removerEm = removerEm;
    }

    public Long getUsuarioId() { return usuarioId; }
    public Instant getRemoverEm() { return removerEm; }
    public Instant getCanceladaEm() { return canceladaEm; }
    public void setCanceladaEm(Instant canceladaEm) { this.canceladaEm = canceladaEm; }
    public Instant getExecutadaEm() { return executadaEm; }
    public void setExecutadaEm(Instant executadaEm) { this.executadaEm = executadaEm; }
}
