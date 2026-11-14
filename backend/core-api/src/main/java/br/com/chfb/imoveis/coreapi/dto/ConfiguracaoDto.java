package br.com.chfb.imoveis.coreapi.dto;

import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Configuração global: identidade, SEO, contato, tema e regras. */
public record ConfiguracaoDto(
        @NotBlank @Size(max = 80) String nomeApp,
        @Size(max = 160) String slogan,
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String logoEscuroUrl,
        @Size(max = 500) String faviconUrl,
        @Size(max = 120) String seoTitulo,
        @Size(max = 300) String seoDescricao,
        @Size(max = 300) String seoPalavrasChave,
        @Size(max = 500) String seoImagemUrl,
        @Size(max = 160) String emailContato,
        @Size(max = 30) String telefoneContato,
        @Size(max = 30) String whatsapp,
        @Size(max = 200) String endereco,
        @Size(max = 200) String instagram,
        @Size(max = 200) String facebook,
        @Size(max = 300) String textoRodape,
        @NotBlank @Pattern(regexp = "Aura|Lara|Nora") String temaPreset,
        @NotBlank @Size(max = 20) String temaPrimaria,
        @Size(max = 20) String temaSurface,
        @NotBlank @Pattern(regexp = "light|dark|auto") String temaModo,
        boolean moderarAnuncios,
        boolean permitirCadastroCorretor) {

    public static ConfiguracaoDto of(Configuracao c) {
        return new ConfiguracaoDto(c.getNomeApp(), c.getSlogan(), c.getLogoUrl(), c.getLogoEscuroUrl(),
                c.getFaviconUrl(), c.getSeoTitulo(), c.getSeoDescricao(), c.getSeoPalavrasChave(), c.getSeoImagemUrl(),
                c.getEmailContato(), c.getTelefoneContato(), c.getWhatsapp(), c.getEndereco(), c.getInstagram(),
                c.getFacebook(), c.getTextoRodape(), c.getTemaPreset(), c.getTemaPrimaria(), c.getTemaSurface(),
                c.getTemaModo(), c.isModerarAnuncios(), c.isPermitirCadastroCorretor());
    }

    public void aplicar(Configuracao c) {
        c.setNomeApp(nomeApp.trim());
        c.setSlogan(slogan);
        c.setLogoUrl(logoUrl);
        c.setLogoEscuroUrl(logoEscuroUrl);
        c.setFaviconUrl(faviconUrl);
        c.setSeoTitulo(seoTitulo);
        c.setSeoDescricao(seoDescricao);
        c.setSeoPalavrasChave(seoPalavrasChave);
        c.setSeoImagemUrl(seoImagemUrl);
        c.setEmailContato(emailContato);
        c.setTelefoneContato(telefoneContato);
        c.setWhatsapp(whatsapp);
        c.setEndereco(endereco);
        c.setInstagram(instagram);
        c.setFacebook(facebook);
        c.setTextoRodape(textoRodape);
        c.setTemaPreset(temaPreset);
        c.setTemaPrimaria(temaPrimaria);
        c.setTemaSurface(temaSurface);
        c.setTemaModo(temaModo);
        c.setModerarAnuncios(moderarAnuncios);
        c.setPermitirCadastroCorretor(permitirCadastroCorretor);
    }
}
