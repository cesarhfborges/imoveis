package br.com.chfb.imoveis.coreapi.entity;

import br.com.chfb.imoveis.sharedkernel.util.Digitos;
import java.math.BigDecimal;
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

    // ---- perfil: contato, atuação profissional e endereço

    @Column(name = "razao_social", length = 160)
    private String razaoSocial;

    @Column(length = 30)
    private String whatsapp;

    @Column(name = "email_contato", length = 160)
    private String emailContato;

    @Column(length = 200)
    private String site;

    @Column(length = 100)
    private String instagram;

    @Column(length = 200)
    private String facebook;

    @Column(length = 2000)
    private String sobre;

    @Column(name = "creci_uf", length = 2)
    private String creciUf;

    @Column(name = "regioes_atuacao", length = 500)
    private String regioesAtuacao;

    @Column(length = 9)
    private String cep;

    @Column(length = 160)
    private String logradouro;

    @Column(length = 20)
    private String numero;

    @Column(length = 80)
    private String complemento;

    @Column(length = 80)
    private String bairro;

    @Column(length = 80)
    private String cidade;

    @Column(length = 2)
    private String uf;

    /** Posição do endereço no mapa (perfil público e diretório de anunciantes). */
    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    /** Anunciante escolheu aparecer no diretório /imobiliarias e ter a página /anunciante/{id}. */
    @Column(name = "perfil_publico", nullable = false)
    private boolean perfilPublico;

    /** Capa do perfil público (1600×200, recortada no envio); nula = degradê padrão. */
    @Column(name = "capa_url", length = 500)
    private String capaUrl;

    /** Ano em que começou a atuar no mercado (anunciantes). */
    @Column(name = "atuando_desde")
    private Short atuandoDesde;

    private boolean ativo = true;

    /** Banimento da conta (manual ou automático pela moderação). */
    @Column(name = "banido_em")
    private java.time.Instant banidoEm;

    @Column(name = "banido_motivo", length = 300)
    private String banidoMotivo;

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

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }
    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = Digitos.somente(whatsapp); }
    public String getEmailContato() { return emailContato; }
    public void setEmailContato(String emailContato) { this.emailContato = emailContato; }
    public String getSite() { return site; }
    public void setSite(String site) { this.site = site; }
    public String getInstagram() { return instagram; }
    public void setInstagram(String instagram) { this.instagram = instagram; }
    public String getFacebook() { return facebook; }
    public void setFacebook(String facebook) { this.facebook = facebook; }
    public String getSobre() { return sobre; }
    public void setSobre(String sobre) { this.sobre = sobre; }
    public String getCreciUf() { return creciUf; }
    public void setCreciUf(String creciUf) { this.creciUf = creciUf; }
    public String getRegioesAtuacao() { return regioesAtuacao; }
    public void setRegioesAtuacao(String regioesAtuacao) { this.regioesAtuacao = regioesAtuacao; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = Digitos.somente(cep); }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    public boolean isPerfilPublico() { return perfilPublico; }
    public void setPerfilPublico(boolean perfilPublico) { this.perfilPublico = perfilPublico; }
    public String getCapaUrl() { return capaUrl; }
    public void setCapaUrl(String capaUrl) { this.capaUrl = capaUrl; }
    public Short getAtuandoDesde() { return atuandoDesde; }
    public void setAtuandoDesde(Short atuandoDesde) { this.atuandoDesde = atuandoDesde; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = Digitos.somente(telefone); }
    public String getCreci() { return creci; }
    public void setCreci(String creci) { this.creci = creci; }
    public String getDocumento() { return documento; }
    public void setDocumento(String documento) { this.documento = Digitos.somente(documento); }
    public String getTipoAnunciante() { return tipoAnunciante; }
    public void setTipoAnunciante(String tipoAnunciante) { this.tipoAnunciante = tipoAnunciante; }
    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }
    public java.time.Instant getBanidoEm() { return banidoEm; }
    public void setBanidoEm(java.time.Instant banidoEm) { this.banidoEm = banidoEm; }
    public String getBanidoMotivo() { return banidoMotivo; }
    public void setBanidoMotivo(String banidoMotivo) { this.banidoMotivo = banidoMotivo; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public Instant getUltimoAcesso() { return ultimoAcesso; }
    public void setUltimoAcesso(Instant ultimoAcesso) { this.ultimoAcesso = ultimoAcesso; }
    public Set<Perfil> getPapeis() { return papeis; }
    public void setPapeis(Set<Perfil> papeis) { this.papeis = papeis; }
}
