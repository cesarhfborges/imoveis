package br.com.chfb.imoveis.moderation.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Arquivo anexado a uma mensagem de pendência (imagem ou PDF), guardado fora da pasta pública. */
@Entity
@Table(name = "denuncia_anexos")
public class AnexoDenuncia {

    @Id
    @Column(length = 60)
    private String nome;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 40)
    private String tipo;

    @Column(nullable = false)
    private long tamanho;

    @Column(length = 200)
    private String original;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @PrePersist
    void aoCriar() {
        criadoEm = Instant.now();
    }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public long getTamanho() { return tamanho; }
    public void setTamanho(long tamanho) { this.tamanho = tamanho; }
    public String getOriginal() { return original; }
    public void setOriginal(String original) { this.original = original; }
    public Instant getCriadoEm() { return criadoEm; }
}
