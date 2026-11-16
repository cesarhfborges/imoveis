package br.com.chfb.imoveis.listing.entity;

import br.com.chfb.imoveis.sharedkernel.util.Digitos;
import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Mensagem (lead) enviada por um visitante sobre um anúncio. */
@Entity
@Table(name = "contatos")
public class Contato extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "imovel_id")
    private Imovel imovel;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(length = 30)
    private String telefone;

    @Column(nullable = false, columnDefinition = "text")
    private String mensagem;

    @Column(name = "usuario_id")
    private Long usuarioId;

    private boolean lido;

    public Imovel getImovel() { return imovel; }
    public void setImovel(Imovel imovel) { this.imovel = imovel; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = Digitos.somente(telefone); }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public boolean isLido() { return lido; }
    public void setLido(boolean lido) { this.lido = lido; }
}
