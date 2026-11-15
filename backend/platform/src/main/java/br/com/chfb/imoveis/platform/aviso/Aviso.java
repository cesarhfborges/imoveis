package br.com.chfb.imoveis.platform.aviso;

import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * Aviso do site (cookies, comunicado, convite para o FAQ...). Cada mudança de conteúdo gera uma nova
 * {@code versao}: quem aceitou uma versão anterior vê o aviso de novo.
 */
@Entity
@Table(name = "avisos")
public class Aviso extends BaseEntity {

    /** Onde o aviso pode aparecer. */
    public enum Area {
        SITE, CONTA, ADMIN
    }

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(length = 120)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String mensagem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoAviso tipo = TipoAviso.MENSAGEM;

    @Column(nullable = false, length = 12)
    private String posicao = "bottom";

    @Column(nullable = false, length = 10)
    private String severidade = "secondary";

    @Column(length = 40)
    private String icone;

    private boolean dispensavel = true;

    private boolean modal = true;

    @Column(name = "texto_aceite", length = 40)
    private String textoAceite;

    @Enumerated(EnumType.STRING)
    @Column(name = "acao_aceite", nullable = false, length = 6)
    private AcaoAceite acaoAceite = AcaoAceite.FECHAR;

    @Column(name = "link_aceite", length = 500)
    private String linkAceite;

    @Column(name = "nova_aba")
    private boolean novaAba;

    @Column(name = "texto_link", length = 60)
    private String textoLink;

    @Column(name = "url_link", length = 500)
    private String urlLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PublicoAviso publico = PublicoAviso.TODOS;

    /** Áreas separadas por vírgula (SITE, CONTA, ADMIN). */
    @Column(nullable = false, length = 40)
    private String areas = "SITE";

    private boolean ativo;

    private int ordem;

    @Column(name = "inicio_em")
    private Instant inicioEm;

    @Column(name = "fim_em")
    private Instant fimEm;

    private int versao = 1;

    @Column(name = "versao_em", nullable = false)
    private Instant versaoEm = Instant.now();

    public Set<Area> getAreasSet() {
        Set<Area> s = EnumSet.noneOf(Area.class);
        Arrays.stream(areas.split(",")).map(String::trim).filter(x -> !x.isEmpty()).map(Area::valueOf).forEach(s::add);
        return s;
    }

    public void setAreasSet(Set<Area> s) {
        this.areas = s.stream().sorted().map(Enum::name).collect(Collectors.joining(","));
    }

    /** Ativo e dentro do período de exibição. */
    public boolean vigente(Instant agora) {
        return ativo && (inicioEm == null || !agora.isBefore(inicioEm)) && (fimEm == null || agora.isBefore(fimEm));
    }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public TipoAviso getTipo() { return tipo; }
    public void setTipo(TipoAviso tipo) { this.tipo = tipo; }
    public String getPosicao() { return posicao; }
    public void setPosicao(String posicao) { this.posicao = posicao; }
    public String getSeveridade() { return severidade; }
    public void setSeveridade(String severidade) { this.severidade = severidade; }
    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }
    public boolean isDispensavel() { return dispensavel; }
    public void setDispensavel(boolean dispensavel) { this.dispensavel = dispensavel; }
    public boolean isModal() { return modal; }
    public void setModal(boolean modal) { this.modal = modal; }
    public String getTextoAceite() { return textoAceite; }
    public void setTextoAceite(String textoAceite) { this.textoAceite = textoAceite; }
    public AcaoAceite getAcaoAceite() { return acaoAceite; }
    public void setAcaoAceite(AcaoAceite acaoAceite) { this.acaoAceite = acaoAceite; }
    public String getLinkAceite() { return linkAceite; }
    public void setLinkAceite(String linkAceite) { this.linkAceite = linkAceite; }
    public boolean isNovaAba() { return novaAba; }
    public void setNovaAba(boolean novaAba) { this.novaAba = novaAba; }
    public String getTextoLink() { return textoLink; }
    public void setTextoLink(String textoLink) { this.textoLink = textoLink; }
    public String getUrlLink() { return urlLink; }
    public void setUrlLink(String urlLink) { this.urlLink = urlLink; }
    public PublicoAviso getPublico() { return publico; }
    public void setPublico(PublicoAviso publico) { this.publico = publico; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
    public Instant getInicioEm() { return inicioEm; }
    public void setInicioEm(Instant inicioEm) { this.inicioEm = inicioEm; }
    public Instant getFimEm() { return fimEm; }
    public void setFimEm(Instant fimEm) { this.fimEm = fimEm; }
    public int getVersao() { return versao; }
    public void setVersao(int versao) { this.versao = versao; }
    public Instant getVersaoEm() { return versaoEm; }
    public void setVersaoEm(Instant versaoEm) { this.versaoEm = versaoEm; }
}
