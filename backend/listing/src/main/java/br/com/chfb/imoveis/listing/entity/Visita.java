package br.com.chfb.imoveis.listing.entity;

import java.time.Instant;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Visita a um imóvel pedida por um cliente logado. */
@Entity
@Table(name = "visitas")
public class Visita extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "imovel_id")
    private Imovel imovel;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(nullable = false)
    private Instant inicio;

    @Column(nullable = false)
    private Instant fim;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusVisita status = StatusVisita.SOLICITADA;

    /** Recado do cliente ao pedir. */
    @Column(columnDefinition = "text")
    private String mensagem;

    /** Último recado do anunciante (motivo da recusa ou do novo horário, ou do cancelamento). */
    @Column(columnDefinition = "text")
    private String resposta;

    /** Horário sugerido pelo anunciante (status NOVO_HORARIO). */
    @Column(name = "proposto_inicio")
    private Instant propostoInicio;

    public Imovel getImovel() { return imovel; }
    public void setImovel(Imovel imovel) { this.imovel = imovel; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public Instant getInicio() { return inicio; }
    public void setInicio(Instant inicio) { this.inicio = inicio; }
    public Instant getFim() { return fim; }
    public void setFim(Instant fim) { this.fim = fim; }
    public StatusVisita getStatus() { return status; }
    public void setStatus(StatusVisita status) { this.status = status; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getResposta() { return resposta; }
    public void setResposta(String resposta) { this.resposta = resposta; }
    public Instant getPropostoInicio() { return propostoInicio; }
    public void setPropostoInicio(Instant propostoInicio) { this.propostoInicio = propostoInicio; }
}
