package br.com.chfb.imoveis.platform.notificacao;

import java.time.Instant;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Aviso para um usuário, com link para o lugar de origem. */
@Entity
@Table(name = "notificacoes")
public class Notificacao extends BaseEntity {

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 500)
    private String mensagem;

    @Column(length = 40)
    private String icone;

    @Column(length = 300)
    private String link;

    @Column(name = "origem_tipo", length = 40)
    private String origemTipo;

    @Column(name = "origem_id")
    private Long origemId;

    @Column(name = "lida_em")
    private Instant lidaEm;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public String getOrigemTipo() { return origemTipo; }
    public void setOrigemTipo(String origemTipo) { this.origemTipo = origemTipo; }
    public Long getOrigemId() { return origemId; }
    public void setOrigemId(Long origemId) { this.origemId = origemId; }
    public Instant getLidaEm() { return lidaEm; }
    public void setLidaEm(Instant lidaEm) { this.lidaEm = lidaEm; }
}
