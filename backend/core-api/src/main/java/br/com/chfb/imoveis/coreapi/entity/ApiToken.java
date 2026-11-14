package br.com.chfb.imoveis.coreapi.entity;

import java.time.Instant;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Token de acesso pessoal para a API aberta (/api/v1). Somente o hash SHA-256
 * é guardado; o valor completo é mostrado uma única vez, na criação.
 */
@Entity
@Table(name = "api_tokens")
public class ApiToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(nullable = false, length = 16)
    private String prefixo;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Perfil perfil;

    @Column(name = "expira_em")
    private Instant expiraEm;

    @Column(name = "ultimo_uso")
    private Instant ultimoUso;

    private boolean revogado;

    public boolean valido(Instant agora) {
        return !revogado && (expiraEm == null || expiraEm.isAfter(agora));
    }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getPrefixo() { return prefixo; }
    public void setPrefixo(String prefixo) { this.prefixo = prefixo; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public Perfil getPerfil() { return perfil; }
    public void setPerfil(Perfil perfil) { this.perfil = perfil; }
    public Instant getExpiraEm() { return expiraEm; }
    public void setExpiraEm(Instant expiraEm) { this.expiraEm = expiraEm; }
    public Instant getUltimoUso() { return ultimoUso; }
    public void setUltimoUso(Instant ultimoUso) { this.ultimoUso = ultimoUso; }
    public boolean isRevogado() { return revogado; }
    public void setRevogado(boolean revogado) { this.revogado = revogado; }
}
