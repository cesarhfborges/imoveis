package br.com.chfb.imoveis.listing.entity;

import java.math.BigDecimal;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** Banco/financeira e as regras usadas na simulação de financiamento dos anúncios. */
@Entity
@Table(name = "financeiras")
public class Financeira extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    private boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "sistema_amortizacao", nullable = false, length = 10)
    private SistemaAmortizacao sistemaAmortizacao = SistemaAmortizacao.AMBOS;

    /** Juros efetivos ao ano, em % (ex.: 10.99). */
    @Column(name = "taxa_juros_anual", nullable = false, precision = 6, scale = 3)
    private BigDecimal taxaJurosAnual;

    @Column(name = "prazo_maximo_meses", nullable = false)
    private int prazoMaximoMeses;

    @Column(name = "entrada_minima_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal entradaMinimaPercentual;

    /** Parte máxima da renda bruta mensal que a parcela pode comprometer, em %. */
    @Column(name = "comprometimento_renda_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal comprometimentoRendaPercentual;

    /** Idade máxima (anos) do comprador ao fim do contrato; nulo = sem limite. */
    @Column(name = "idade_maxima_quitacao")
    private Integer idadeMaximaQuitacao;

    @Column(name = "valor_minimo_imovel", precision = 15, scale = 2)
    private BigDecimal valorMinimoImovel;

    @Column(name = "valor_maximo_imovel", precision = 15, scale = 2)
    private BigDecimal valorMaximoImovel;

    /** Seguros obrigatórios (MIP/DFI) sobre o saldo devedor, em % ao mês. */
    @Column(name = "seguro_mensal_percentual", nullable = false, precision = 7, scale = 4)
    private BigDecimal seguroMensalPercentual = BigDecimal.ZERO;

    @Column(name = "taxa_administracao_mensal", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxaAdministracaoMensal = BigDecimal.ZERO;

    @Column(name = "aceita_fgts")
    private boolean aceitaFgts = true;

    @Column(length = 1000)
    private String observacoes;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public SistemaAmortizacao getSistemaAmortizacao() { return sistemaAmortizacao; }
    public void setSistemaAmortizacao(SistemaAmortizacao sistemaAmortizacao) { this.sistemaAmortizacao = sistemaAmortizacao; }
    public BigDecimal getTaxaJurosAnual() { return taxaJurosAnual; }
    public void setTaxaJurosAnual(BigDecimal taxaJurosAnual) { this.taxaJurosAnual = taxaJurosAnual; }
    public int getPrazoMaximoMeses() { return prazoMaximoMeses; }
    public void setPrazoMaximoMeses(int prazoMaximoMeses) { this.prazoMaximoMeses = prazoMaximoMeses; }
    public BigDecimal getEntradaMinimaPercentual() { return entradaMinimaPercentual; }
    public void setEntradaMinimaPercentual(BigDecimal entradaMinimaPercentual) { this.entradaMinimaPercentual = entradaMinimaPercentual; }
    public BigDecimal getComprometimentoRendaPercentual() { return comprometimentoRendaPercentual; }
    public void setComprometimentoRendaPercentual(BigDecimal v) { this.comprometimentoRendaPercentual = v; }
    public Integer getIdadeMaximaQuitacao() { return idadeMaximaQuitacao; }
    public void setIdadeMaximaQuitacao(Integer idadeMaximaQuitacao) { this.idadeMaximaQuitacao = idadeMaximaQuitacao; }
    public BigDecimal getValorMinimoImovel() { return valorMinimoImovel; }
    public void setValorMinimoImovel(BigDecimal valorMinimoImovel) { this.valorMinimoImovel = valorMinimoImovel; }
    public BigDecimal getValorMaximoImovel() { return valorMaximoImovel; }
    public void setValorMaximoImovel(BigDecimal valorMaximoImovel) { this.valorMaximoImovel = valorMaximoImovel; }
    public BigDecimal getSeguroMensalPercentual() { return seguroMensalPercentual; }
    public void setSeguroMensalPercentual(BigDecimal seguroMensalPercentual) { this.seguroMensalPercentual = seguroMensalPercentual; }
    public BigDecimal getTaxaAdministracaoMensal() { return taxaAdministracaoMensal; }
    public void setTaxaAdministracaoMensal(BigDecimal taxaAdministracaoMensal) { this.taxaAdministracaoMensal = taxaAdministracaoMensal; }
    public boolean isAceitaFgts() { return aceitaFgts; }
    public void setAceitaFgts(boolean aceitaFgts) { this.aceitaFgts = aceitaFgts; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
}
