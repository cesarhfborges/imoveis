package br.com.chfb.imoveis.moderation.entity;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Tipo de denúncia (cadastrável), com o prazo de resposta do anunciante em minutos úteis. */
@Entity
@Table(name = "denuncia_tipos")
public class TipoDenuncia extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(length = 300)
    private String descricao;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "gravidade_id")
    private Gravidade gravidade;

    @Column(name = "sla_minutos", nullable = false)
    private int slaMinutos;

    /** Suspende o anúncio na hora em que a denúncia é aberta (casos graves). */
    @Column(name = "suspender_ao_abrir")
    private boolean suspenderAoAbrir;

    private boolean ativo = true;

    private int ordem;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Gravidade getGravidade() { return gravidade; }
    public void setGravidade(Gravidade gravidade) { this.gravidade = gravidade; }
    public int getSlaMinutos() { return slaMinutos; }
    public void setSlaMinutos(int slaMinutos) { this.slaMinutos = slaMinutos; }
    public boolean isSuspenderAoAbrir() { return suspenderAoAbrir; }
    public void setSuspenderAoAbrir(boolean suspenderAoAbrir) { this.suspenderAoAbrir = suspenderAoAbrir; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
}
