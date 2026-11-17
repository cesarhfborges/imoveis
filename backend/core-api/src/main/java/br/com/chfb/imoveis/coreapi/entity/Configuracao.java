package br.com.chfb.imoveis.coreapi.entity;

import br.com.chfb.imoveis.sharedkernel.util.Digitos;
import br.com.chfb.imoveis.sharedkernel.entity.BaseEntity;
import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** Configuração global do sistema (linha única), editada em /admin/configuracoes. */
@Entity
@Table(name = "configuracoes")
public class Configuracao extends BaseEntity {

    // Identidade
    @Column(name = "nome_app", nullable = false, length = 80)
    private String nomeApp;
    @Column(length = 160)
    private String slogan;
    @Column(name = "logo_url", length = 500)
    private String logoUrl = "/marca/logo.png";
    @Column(name = "logo_escuro_url", length = 500)
    private String logoEscuroUrl = "/marca/logo-branco.png";
    @Column(name = "favicon_url", length = 500)
    private String faviconUrl;

    // SEO
    @Column(name = "seo_titulo", length = 120)
    private String seoTitulo;
    @Column(name = "seo_descricao", length = 300)
    private String seoDescricao;
    @Column(name = "seo_palavras_chave", length = 300)
    private String seoPalavrasChave;
    @Column(name = "seo_imagem_url", length = 500)
    private String seoImagemUrl;

    // Contato
    @Column(name = "email_contato", length = 160)
    private String emailContato;
    @Column(name = "telefone_contato", length = 30)
    private String telefoneContato;
    @Column(length = 30)
    private String whatsapp;
    @Column(length = 200)
    private String endereco;
    @Column(length = 200)
    private String instagram;
    @Column(length = 200)
    private String facebook;
    @Column(name = "texto_rodape", length = 300)
    private String textoRodape;

    // Tema
    @Column(name = "tema_preset", nullable = false, length = 20)
    private String temaPreset = "Aura";
    @Column(name = "tema_primaria", nullable = false, length = 20)
    private String temaPrimaria = "blue";
    @Column(name = "tema_surface", length = 20)
    private String temaSurface;
    /** light, dark ou auto (segue o sistema operacional do visitante). */
    @Column(name = "tema_modo", nullable = false, length = 10)
    private String temaModo = "auto";

    // Regras
    @Column(name = "moderar_anuncios")
    private boolean moderarAnuncios;
    @Column(name = "permitir_cadastro_corretor")
    private boolean permitirCadastroCorretor = true;
    @Column(name = "abrir_anuncio_nova_janela")
    private boolean abrirAnuncioNovaJanela;
    @Enumerated(EnumType.STRING)
    @Column(name = "telefone_anunciante", nullable = false, length = 30)
    private ExibicaoTelefonePolicy.Modo telefoneAnunciante = ExibicaoTelefonePolicy.Modo.MOSTRAR;
    @Column(name = "simulacao_financiamento")
    private boolean simulacaoFinanciamento = true;
    @Column(name = "alerta_queda_preco")
    private boolean alertaQuedaPreco = true;
    @Column(name = "impressao_anuncio")
    private boolean impressaoAnuncio = true;

    /** Registra e mostra os imóveis vistos pelo usuário logado. */
    @Column(name = "vistos_recentes")
    private boolean vistosRecentes = true;

    /** Relatório de cada anúncio para o anunciante. */
    @Column(name = "relatorio_anuncio")
    private boolean relatorioAnuncio = true;

    /** /sitemap.xml e dados estruturados (schema.org) para os buscadores. */
    @Column(name = "sitemap_seo")
    private boolean sitemapSeo = true;

    /** Etapas e anotações nos contatos recebidos pelo anunciante. */
    @Column(name = "etapas_contatos")
    private boolean etapasContatos = true;

    /** Agendamento de visitas pela página do imóvel. */
    @Column(name = "agendamento_visita")
    private boolean agendamentoVisita = true;

    /** Mostra "Remover conta" em Meus dados (o próprio usuário pede a remoção definitiva). */
    @Column(name = "auto_exclusao_conta")
    private boolean autoExclusaoConta = true;

    /** Dias de espera entre o pedido de remoção e a remoção definitiva. */
    @Column(name = "dias_espera_exclusao")
    private int diasEsperaExclusao = 7;

    public String getNomeApp() { return nomeApp; }
    public void setNomeApp(String nomeApp) { this.nomeApp = nomeApp; }
    public String getSlogan() { return slogan; }
    public void setSlogan(String slogan) { this.slogan = slogan; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getLogoEscuroUrl() { return logoEscuroUrl; }
    public void setLogoEscuroUrl(String logoEscuroUrl) { this.logoEscuroUrl = logoEscuroUrl; }
    public String getFaviconUrl() { return faviconUrl; }
    public void setFaviconUrl(String faviconUrl) { this.faviconUrl = faviconUrl; }
    public String getSeoTitulo() { return seoTitulo; }
    public void setSeoTitulo(String seoTitulo) { this.seoTitulo = seoTitulo; }
    public String getSeoDescricao() { return seoDescricao; }
    public void setSeoDescricao(String seoDescricao) { this.seoDescricao = seoDescricao; }
    public String getSeoPalavrasChave() { return seoPalavrasChave; }
    public void setSeoPalavrasChave(String seoPalavrasChave) { this.seoPalavrasChave = seoPalavrasChave; }
    public String getSeoImagemUrl() { return seoImagemUrl; }
    public void setSeoImagemUrl(String seoImagemUrl) { this.seoImagemUrl = seoImagemUrl; }
    public String getEmailContato() { return emailContato; }
    public void setEmailContato(String emailContato) { this.emailContato = emailContato; }
    public String getTelefoneContato() { return telefoneContato; }
    public void setTelefoneContato(String telefoneContato) { this.telefoneContato = Digitos.somente(telefoneContato); }
    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = Digitos.somente(whatsapp); }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public String getInstagram() { return instagram; }
    public void setInstagram(String instagram) { this.instagram = instagram; }
    public String getFacebook() { return facebook; }
    public void setFacebook(String facebook) { this.facebook = facebook; }
    public String getTextoRodape() { return textoRodape; }
    public void setTextoRodape(String textoRodape) { this.textoRodape = textoRodape; }
    public String getTemaPreset() { return temaPreset; }
    public void setTemaPreset(String temaPreset) { this.temaPreset = temaPreset; }
    public String getTemaPrimaria() { return temaPrimaria; }
    public void setTemaPrimaria(String temaPrimaria) { this.temaPrimaria = temaPrimaria; }
    public String getTemaSurface() { return temaSurface; }
    public void setTemaSurface(String temaSurface) { this.temaSurface = temaSurface; }
    public String getTemaModo() { return temaModo; }
    public void setTemaModo(String temaModo) { this.temaModo = temaModo; }
    public boolean isModerarAnuncios() { return moderarAnuncios; }
    public void setModerarAnuncios(boolean moderarAnuncios) { this.moderarAnuncios = moderarAnuncios; }
    public ExibicaoTelefonePolicy.Modo getTelefoneAnunciante() { return telefoneAnunciante; }
    public void setTelefoneAnunciante(ExibicaoTelefonePolicy.Modo telefoneAnunciante) { this.telefoneAnunciante = telefoneAnunciante; }
    public boolean isSimulacaoFinanciamento() { return simulacaoFinanciamento; }
    public void setSimulacaoFinanciamento(boolean simulacaoFinanciamento) { this.simulacaoFinanciamento = simulacaoFinanciamento; }
    public boolean isAlertaQuedaPreco() { return alertaQuedaPreco; }
    public void setAlertaQuedaPreco(boolean alertaQuedaPreco) { this.alertaQuedaPreco = alertaQuedaPreco; }
    public boolean isImpressaoAnuncio() { return impressaoAnuncio; }
    public void setImpressaoAnuncio(boolean impressaoAnuncio) { this.impressaoAnuncio = impressaoAnuncio; }
    public boolean isRelatorioAnuncio() { return relatorioAnuncio; }
    public void setRelatorioAnuncio(boolean relatorioAnuncio) { this.relatorioAnuncio = relatorioAnuncio; }
    public boolean isSitemapSeo() { return sitemapSeo; }
    public void setSitemapSeo(boolean sitemapSeo) { this.sitemapSeo = sitemapSeo; }
    public boolean isEtapasContatos() { return etapasContatos; }
    public void setEtapasContatos(boolean etapasContatos) { this.etapasContatos = etapasContatos; }
    public boolean isAgendamentoVisita() { return agendamentoVisita; }
    public void setAgendamentoVisita(boolean agendamentoVisita) { this.agendamentoVisita = agendamentoVisita; }
    public boolean isVistosRecentes() { return vistosRecentes; }
    public void setVistosRecentes(boolean vistosRecentes) { this.vistosRecentes = vistosRecentes; }
    public boolean isAutoExclusaoConta() { return autoExclusaoConta; }
    public void setAutoExclusaoConta(boolean autoExclusaoConta) { this.autoExclusaoConta = autoExclusaoConta; }
    public int getDiasEsperaExclusao() { return diasEsperaExclusao; }
    public void setDiasEsperaExclusao(int diasEsperaExclusao) { this.diasEsperaExclusao = diasEsperaExclusao; }
    public boolean isAbrirAnuncioNovaJanela() { return abrirAnuncioNovaJanela; }
    public void setAbrirAnuncioNovaJanela(boolean abrirAnuncioNovaJanela) { this.abrirAnuncioNovaJanela = abrirAnuncioNovaJanela; }
    public boolean isPermitirCadastroCorretor() { return permitirCadastroCorretor; }
    public void setPermitirCadastroCorretor(boolean permitirCadastroCorretor) { this.permitirCadastroCorretor = permitirCadastroCorretor; }
}
