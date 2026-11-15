package br.com.chfb.imoveis.moderation.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/**
 * Denúncia de um usuário sobre um anúncio. Várias denúncias do mesmo anúncio formam as "pendências" dele,
 * mas cada uma tem o seu tipo, a sua conversa e o seu prazo (SLA, que só corre do lado do anunciante).
 */
@Entity
@Table(name = "denuncias")
public class Denuncia extends BaseEntity {

    @Column(name = "imovel_id", nullable = false)
    private Long imovelId;

    @Column(name = "denunciante_id", nullable = false)
    private Long denuncianteId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tipo_id")
    private TipoDenuncia tipo;

    /** Gravidade no momento da abertura (a contagem para banimento usa esta). */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "gravidade_id")
    private Gravidade gravidade;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Natureza natureza;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private MedidaAnuncio medida;

    /** Procedente: consequência para a conta do anunciante. */
    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private PenalidadeConta penalidade;

    /** Quando foi julgada procedente (a janela do banimento automático conta daqui). */
    @Column(name = "julgado_em")
    private Instant julgadoEm;

    /** Prazo interno da apuração (só alerta a moderação). */
    @Column(name = "apuracao_prazo_em")
    private Instant apuracaoPrazoEm;

    @Column(name = "apuracao_aviso_enviado")
    private boolean apuracaoAvisoEnviado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusDenuncia status = StatusDenuncia.AGUARDANDO_ANUNCIANTE;

    /** 0 = prazo inicial; 1 = prazo extra depois da etapa 1; 2 = sem mais ações automáticas. */
    private short etapa;

    @Column(name = "sla_inicio")
    private Instant slaInicio;

    @Column(name = "sla_minutos")
    private Integer slaMinutos;

    @Column(name = "prazo_em")
    private Instant prazoEm;

    @Column(name = "minutos_restantes")
    private Integer minutosRestantes;

    /** Minutos úteis que faltavam quando o anunciante respondeu (o prazo retoma daqui). */
    @Column(name = "minutos_na_pausa")
    private Integer minutosNaPausa;

    @Column(name = "aviso_enviado")
    private boolean avisoEnviado;

    @Column(name = "resolvido_por")
    private Long resolvidoPor;

    @Column(name = "resolvido_em")
    private Instant resolvidoEm;

    @Column(columnDefinition = "text")
    private String conclusao;

    @OneToMany(mappedBy = "denuncia", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("criadoEm asc, id asc")
    private List<DenunciaMensagem> mensagens = new ArrayList<>();

    public DenunciaMensagem adicionarMensagem(PapelMensagem papel, Long autorId, String texto, String anexos,
            boolean interna) {
        DenunciaMensagem m = new DenunciaMensagem();
        m.setDenuncia(this);
        m.setPapel(papel);
        m.setAutorId(autorId);
        m.setTexto(texto);
        m.setAnexos(anexos);
        m.setInterna(interna);
        mensagens.add(m);
        return m;
    }

    public Long getImovelId() { return imovelId; }
    public void setImovelId(Long imovelId) { this.imovelId = imovelId; }
    public Long getDenuncianteId() { return denuncianteId; }
    public void setDenuncianteId(Long denuncianteId) { this.denuncianteId = denuncianteId; }
    public TipoDenuncia getTipo() { return tipo; }
    public void setTipo(TipoDenuncia tipo) { this.tipo = tipo; }
    public Gravidade getGravidade() { return gravidade; }
    public void setGravidade(Gravidade gravidade) { this.gravidade = gravidade; }
    public Natureza getNatureza() { return natureza; }
    public void setNatureza(Natureza natureza) { this.natureza = natureza; }
    public MedidaAnuncio getMedida() { return medida; }
    public void setMedida(MedidaAnuncio medida) { this.medida = medida; }
    public PenalidadeConta getPenalidade() { return penalidade; }
    public void setPenalidade(PenalidadeConta penalidade) { this.penalidade = penalidade; }
    public Instant getJulgadoEm() { return julgadoEm; }
    public void setJulgadoEm(Instant julgadoEm) { this.julgadoEm = julgadoEm; }

    /** Julgada procedente (com correção pendente ou já encerrada). */
    public boolean julgadaProcedente() { return natureza != null; }

    /** Procedente com correção solicitada e ainda aberta. */
    public boolean correcaoPendente() { return medida == MedidaAnuncio.CORRIGIR && status.aberta(); }

    /** Desfaz o julgamento (procedente) para julgar de novo. */
    public void limparJulgamento() {
        natureza = null;
        medida = null;
        penalidade = null;
        julgadoEm = null;
    }

    public Instant getApuracaoPrazoEm() { return apuracaoPrazoEm; }
    public void setApuracaoPrazoEm(Instant apuracaoPrazoEm) { this.apuracaoPrazoEm = apuracaoPrazoEm; }
    public boolean isApuracaoAvisoEnviado() { return apuracaoAvisoEnviado; }
    public void setApuracaoAvisoEnviado(boolean apuracaoAvisoEnviado) { this.apuracaoAvisoEnviado = apuracaoAvisoEnviado; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public StatusDenuncia getStatus() { return status; }
    public void setStatus(StatusDenuncia status) { this.status = status; }
    public short getEtapa() { return etapa; }
    public void setEtapa(short etapa) { this.etapa = etapa; }
    public Instant getSlaInicio() { return slaInicio; }
    public void setSlaInicio(Instant slaInicio) { this.slaInicio = slaInicio; }
    public Integer getSlaMinutos() { return slaMinutos; }
    public void setSlaMinutos(Integer slaMinutos) { this.slaMinutos = slaMinutos; }
    public Instant getPrazoEm() { return prazoEm; }
    public void setPrazoEm(Instant prazoEm) { this.prazoEm = prazoEm; }
    public Integer getMinutosRestantes() { return minutosRestantes; }
    public void setMinutosRestantes(Integer minutosRestantes) { this.minutosRestantes = minutosRestantes; }
    public Integer getMinutosNaPausa() { return minutosNaPausa; }
    public void setMinutosNaPausa(Integer minutosNaPausa) { this.minutosNaPausa = minutosNaPausa; }
    public boolean isAvisoEnviado() { return avisoEnviado; }
    public void setAvisoEnviado(boolean avisoEnviado) { this.avisoEnviado = avisoEnviado; }
    public Long getResolvidoPor() { return resolvidoPor; }
    public void setResolvidoPor(Long resolvidoPor) { this.resolvidoPor = resolvidoPor; }
    public Instant getResolvidoEm() { return resolvidoEm; }
    public void setResolvidoEm(Instant resolvidoEm) { this.resolvidoEm = resolvidoEm; }
    public String getConclusao() { return conclusao; }
    public void setConclusao(String conclusao) { this.conclusao = conclusao; }
    public List<DenunciaMensagem> getMensagens() { return mensagens; }
}
