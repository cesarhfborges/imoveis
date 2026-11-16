package br.com.chfb.imoveis.listing.entity;

import br.com.chfb.imoveis.sharedkernel.util.Digitos;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "imoveis")
public class Imovel extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(columnDefinition = "text")
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Finalidade finalidade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoImovel tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusAnuncio status = StatusAnuncio.ATIVO;

    /** Status de antes da suspensão/banimento pela moderação (para voltar a ele ao reativar). */
    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 20)
    private StatusAnuncio statusAnterior;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal preco;

    @Column(precision = 15, scale = 2)
    private BigDecimal condominio;

    @Column(precision = 15, scale = 2)
    private BigDecimal iptu;

    @Column(name = "area_util", precision = 10, scale = 2)
    private BigDecimal areaUtil;

    @Column(name = "area_total", precision = 10, scale = 2)
    private BigDecimal areaTotal;

    private Integer quartos;
    private Integer suites;
    private Integer banheiros;
    private Integer vagas;

    @Column(length = 2, nullable = false)
    private String uf;

    @Column(length = 80, nullable = false)
    private String cidade;

    @Column(length = 80, nullable = false)
    private String bairro;

    @Column(length = 200)
    private String endereco;

    @Column(length = 20)
    private String numero;

    @Column(length = 9)
    private String cep;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    private boolean lancamento;

    private boolean destaque;

    @Column(name = "aceita_financiamento")
    private boolean aceitaFinanciamento;

    // Documentação e condições de negócio
    @Column(name = "aceita_fgts")
    private boolean aceitaFgts;

    @Column(name = "aceita_permuta")
    private boolean aceitaPermuta;

    @Column(name = "escritura_registrada")
    private boolean escrituraRegistrada;

    private boolean quitado;

    @Column(name = "anunciante_id", nullable = false)
    private Long anuncianteId;

    private long visualizacoes;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "imovel_fotos", joinColumns = @JoinColumn(name = "imovel_id"))
    @OrderColumn(name = "ordem")
    private List<FotoImovel> fotos = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "imovel_caracteristicas", joinColumns = @JoinColumn(name = "imovel_id"))
    @Column(name = "nome", length = 60)
    private Set<String> caracteristicas = new LinkedHashSet<>();

    public String getCodigo() {
        return getId() == null ? null : String.format("IM-%06d", getId());
    }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Finalidade getFinalidade() { return finalidade; }
    public void setFinalidade(Finalidade finalidade) { this.finalidade = finalidade; }
    public TipoImovel getTipo() { return tipo; }
    public void setTipo(TipoImovel tipo) { this.tipo = tipo; }
    public StatusAnuncio getStatusAnterior() { return statusAnterior; }
    public void setStatusAnterior(StatusAnuncio statusAnterior) { this.statusAnterior = statusAnterior; }
    public StatusAnuncio getStatus() { return status; }
    public void setStatus(StatusAnuncio status) { this.status = status; }
    public BigDecimal getPreco() { return preco; }
    public void setPreco(BigDecimal preco) { this.preco = preco; }
    public BigDecimal getCondominio() { return condominio; }
    public void setCondominio(BigDecimal condominio) { this.condominio = condominio; }
    public BigDecimal getIptu() { return iptu; }
    public void setIptu(BigDecimal iptu) { this.iptu = iptu; }
    public BigDecimal getAreaUtil() { return areaUtil; }
    public void setAreaUtil(BigDecimal areaUtil) { this.areaUtil = areaUtil; }
    public BigDecimal getAreaTotal() { return areaTotal; }
    public void setAreaTotal(BigDecimal areaTotal) { this.areaTotal = areaTotal; }
    public Integer getQuartos() { return quartos; }
    public void setQuartos(Integer quartos) { this.quartos = quartos; }
    public Integer getSuites() { return suites; }
    public void setSuites(Integer suites) { this.suites = suites; }
    public Integer getBanheiros() { return banheiros; }
    public void setBanheiros(Integer banheiros) { this.banheiros = banheiros; }
    public Integer getVagas() { return vagas; }
    public void setVagas(Integer vagas) { this.vagas = vagas; }
    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = Digitos.somente(cep); }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public boolean isLancamento() { return lancamento; }
    public void setLancamento(boolean lancamento) { this.lancamento = lancamento; }
    public boolean isDestaque() { return destaque; }
    public void setDestaque(boolean destaque) { this.destaque = destaque; }
    public boolean isAceitaFinanciamento() { return aceitaFinanciamento; }
    public void setAceitaFinanciamento(boolean aceitaFinanciamento) { this.aceitaFinanciamento = aceitaFinanciamento; }
    public boolean isAceitaFgts() { return aceitaFgts; }
    public void setAceitaFgts(boolean v) { this.aceitaFgts = v; }
    public boolean isAceitaPermuta() { return aceitaPermuta; }
    public void setAceitaPermuta(boolean v) { this.aceitaPermuta = v; }
    public boolean isEscrituraRegistrada() { return escrituraRegistrada; }
    public void setEscrituraRegistrada(boolean v) { this.escrituraRegistrada = v; }
    public boolean isQuitado() { return quitado; }
    public void setQuitado(boolean v) { this.quitado = v; }
    public Long getAnuncianteId() { return anuncianteId; }
    public void setAnuncianteId(Long anuncianteId) { this.anuncianteId = anuncianteId; }
    public long getVisualizacoes() { return visualizacoes; }
    public void setVisualizacoes(long visualizacoes) { this.visualizacoes = visualizacoes; }
    public List<FotoImovel> getFotos() { return fotos; }
    public void setFotos(List<FotoImovel> fotos) { this.fotos = fotos; }
    public Set<String> getCaracteristicas() { return caracteristicas; }
    public void setCaracteristicas(Set<String> caracteristicas) { this.caracteristicas = caracteristicas; }
}
