package br.com.chfb.imoveis.coreapi.entity;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class Usuario extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Column(length = 30)
    private String telefone;

    @Column(length = 30)
    private String creci;

    /** CPF ou CNPJ (anunciantes). */
    @Column(length = 20)
    private String documento;

    /** CORRETOR ou IMOBILIARIA (somente anunciantes). */
    @Column(name = "tipo_anunciante", length = 20)
    private String tipoAnunciante;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    private boolean ativo = true;

    @Column(name = "ultimo_acesso")
    private Instant ultimoAcesso;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_papeis", joinColumns = @JoinColumn(name = "usuario_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "papel", length = 20)
    private Set<Perfil> papeis = EnumSet.noneOf(Perfil.class);

    public Set<Perfil> perfisPermitidos() {
        return Perfil.permitidosPara(papeis);
    }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getCreci() { return creci; }
    public void setCreci(String creci) { this.creci = creci; }
    public String getDocumento() { return documento; }
    public void setDocumento(String documento) { this.documento = documento; }
    public String getTipoAnunciante() { return tipoAnunciante; }
    public void setTipoAnunciante(String tipoAnunciante) { this.tipoAnunciante = tipoAnunciante; }
    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public Instant getUltimoAcesso() { return ultimoAcesso; }
    public void setUltimoAcesso(Instant ultimoAcesso) { this.ultimoAcesso = ultimoAcesso; }
    public Set<Perfil> getPapeis() { return papeis; }
    public void setPapeis(Set<Perfil> papeis) { this.papeis = papeis; }
}
