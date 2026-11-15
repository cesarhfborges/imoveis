package br.com.chfb.imoveis.moderation.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/** Regras gerais da moderação (linha única). */
@Entity
@Table(name = "moderacao_config")
public class ModeracaoConfig {

    @Id
    private Short id = 1;

    @Column(name = "automacao_ativa")
    private boolean automacaoAtiva = true;

    @Column(name = "aprovar_reativa_anuncio")
    private boolean aprovarReativaAnuncio = true;

    @Column(name = "ajuste_sla_minutos", nullable = false)
    private int ajusteSlaMinutos = 600;

    @Enumerated(EnumType.STRING)
    @Column(name = "etapa1_acao", nullable = false, length = 20)
    private AcaoAutomatica etapa1Acao = AcaoAutomatica.SUSPENDER;

    @Column(name = "etapa1_prazo_minutos", nullable = false)
    private int etapa1PrazoMinutos = 1200;

    @Enumerated(EnumType.STRING)
    @Column(name = "etapa2_acao", nullable = false, length = 20)
    private AcaoAutomatica etapa2Acao = AcaoAutomatica.BANIR;

    @Column(name = "aviso_minutos", nullable = false)
    private int avisoMinutos = 60;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @PrePersist
    @PreUpdate
    void tocar() {
        atualizadoEm = Instant.now();
    }

    public Short getId() { return id; }
    public boolean isAutomacaoAtiva() { return automacaoAtiva; }
    public void setAutomacaoAtiva(boolean automacaoAtiva) { this.automacaoAtiva = automacaoAtiva; }
    public boolean isAprovarReativaAnuncio() { return aprovarReativaAnuncio; }
    public void setAprovarReativaAnuncio(boolean aprovarReativaAnuncio) { this.aprovarReativaAnuncio = aprovarReativaAnuncio; }
    public int getAjusteSlaMinutos() { return ajusteSlaMinutos; }
    public void setAjusteSlaMinutos(int ajusteSlaMinutos) { this.ajusteSlaMinutos = ajusteSlaMinutos; }
    public AcaoAutomatica getEtapa1Acao() { return etapa1Acao; }
    public void setEtapa1Acao(AcaoAutomatica etapa1Acao) { this.etapa1Acao = etapa1Acao; }
    public int getEtapa1PrazoMinutos() { return etapa1PrazoMinutos; }
    public void setEtapa1PrazoMinutos(int etapa1PrazoMinutos) { this.etapa1PrazoMinutos = etapa1PrazoMinutos; }
    public AcaoAutomatica getEtapa2Acao() { return etapa2Acao; }
    public void setEtapa2Acao(AcaoAutomatica etapa2Acao) { this.etapa2Acao = etapa2Acao; }
    public int getAvisoMinutos() { return avisoMinutos; }
    public void setAvisoMinutos(int avisoMinutos) { this.avisoMinutos = avisoMinutos; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
