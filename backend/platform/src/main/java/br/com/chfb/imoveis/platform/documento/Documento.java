package br.com.chfb.imoveis.platform.documento;

import java.time.Instant;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** Documento do site (termos, privacidade, código de conduta…) com versão e regras de aceite. */
@Entity
@Table(name = "documentos")
public class Documento extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoDocumento tipo;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(length = 300)
    private String resumo;

    @Column(nullable = false, columnDefinition = "text")
    private String conteudo = "";

    private int versao = 1;

    @Column(name = "versao_em", nullable = false)
    private Instant versaoEm = Instant.now();

    private boolean ativo;
    private boolean publico = true;

    @Column(name = "aceite_cadastro")
    private boolean aceiteCadastro;

    @Column(name = "aceite_contas")
    private boolean aceiteContas;

    @Enumerated(EnumType.STRING)
    @Column(name = "aceite_perfil", nullable = false, length = 10)
    private PerfilAceite aceitePerfil = PerfilAceite.TODOS;

    private int ordem;

    @Column(name = "excluido_em")
    private Instant excluidoEm;

    public boolean exigeAceite() {
        return aceiteCadastro || aceiteContas;
    }

    public TipoDocumento getTipo() { return tipo; }
    public void setTipo(TipoDocumento tipo) { this.tipo = tipo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getResumo() { return resumo; }
    public void setResumo(String resumo) { this.resumo = resumo; }
    public String getConteudo() { return conteudo; }
    public void setConteudo(String conteudo) { this.conteudo = conteudo; }
    public int getVersao() { return versao; }
    public void setVersao(int versao) { this.versao = versao; }
    public Instant getVersaoEm() { return versaoEm; }
    public void setVersaoEm(Instant versaoEm) { this.versaoEm = versaoEm; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public boolean isPublico() { return publico; }
    public void setPublico(boolean publico) { this.publico = publico; }
    public boolean isAceiteCadastro() { return aceiteCadastro; }
    public void setAceiteCadastro(boolean aceiteCadastro) { this.aceiteCadastro = aceiteCadastro; }
    public boolean isAceiteContas() { return aceiteContas; }
    public void setAceiteContas(boolean aceiteContas) { this.aceiteContas = aceiteContas; }
    public PerfilAceite getAceitePerfil() { return aceitePerfil; }
    public void setAceitePerfil(PerfilAceite aceitePerfil) { this.aceitePerfil = aceitePerfil; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
    public Instant getExcluidoEm() { return excluidoEm; }
    public void setExcluidoEm(Instant excluidoEm) { this.excluidoEm = excluidoEm; }
}
