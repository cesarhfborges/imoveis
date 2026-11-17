package br.com.chfb.imoveis.coreapi.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.web.util.HtmlUtils;

import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;

/**
 * HTML mínimo com as tags Open Graph de um anúncio, para a prévia de link do WhatsApp e das redes sociais.
 * Os robôs dessas prévias não executam JavaScript, então não enxergam o que o Angular coloca na página: o nginx
 * manda só eles para cá (ver infra/nginx). A imagem é a foto de capa do anúncio.
 */
public final class PreviaLinkHtml {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private PreviaLinkHtml() {
    }

    /**
     * @param base          origem pública do site (ex.: https://imoveis.exemplo.com.br), sem barra no fim
     * @param site          nome do site (configuração)
     * @param imagemPadrao  imagem do site para anúncio sem foto (pode ser nula)
     */
    public static String doImovel(ImovelDetalhe i, String base, String site, String imagemPadrao) {
        String url = base + "/imovel/" + i.id();
        String foto = i.fotos() == null || i.fotos().isEmpty() ? imagemPadrao : i.fotos().get(0).url();
        return pagina(titulo(i), descricao(i), absoluta(foto, base), url, site, "Foto do imóvel: " + titulo(i));
    }

    /** Anúncio inexistente ou fora do ar: prévia com os dados do próprio site. */
    public static String doSite(String base, String site, String descricao, String imagem) {
        return pagina(site, descricao == null ? "" : descricao, absoluta(imagem, base), base + "/", site, site);
    }

    /** Ex.: "Apartamento à venda em Asa Norte, Brasília/DF". */
    static String titulo(ImovelDetalhe i) {
        String acao = switch (i.finalidade()) {
            case VENDA -> "à venda";
            case ALUGUEL -> "para alugar";
            case TEMPORADA -> "para temporada";
        };
        String cidade = Stream.of(i.cidade(), i.uf()).filter(PreviaLinkHtml::preenchido).collect(Collectors.joining("/"));
        String local = Stream.of(i.bairro(), cidade).filter(PreviaLinkHtml::preenchido).collect(Collectors.joining(", "));
        return (i.lancamento() ? "Lançamento: " : "") + i.tipoDescricao() + " " + acao + (local.isEmpty() ? "" : " em " + local);
    }

    /** Ex.: "R$ 540.000,00 · 74 m² · 2 quartos (1 suíte) · 1 vaga · cód. IM-000665". */
    static String descricao(ImovelDetalhe i) {
        List<String> partes = new ArrayList<>();
        String sufixo = switch (i.finalidade()) {
            case VENDA -> "";
            case ALUGUEL -> "/mês";
            case TEMPORADA -> "/dia";
        };
        partes.add(i.preco() == null ? "Valor sob consulta" : moeda(i.preco()) + sufixo);
        if (i.areaUtil() != null && i.areaUtil().signum() > 0) {
            partes.add(NumberFormat.getNumberInstance(PT_BR).format(i.areaUtil()) + " m²");
        }
        if (i.quartos() != null && i.quartos() > 0) {
            String q = plural(i.quartos(), "quarto", "quartos");
            partes.add(i.suites() != null && i.suites() > 0 ? q + " (" + plural(i.suites(), "suíte", "suítes") + ")" : q);
        }
        if (i.vagas() != null && i.vagas() > 0) {
            partes.add(plural(i.vagas(), "vaga", "vagas"));
        }
        partes.add("cód. " + i.codigo());
        return String.join(" · ", partes);
    }

    private static String pagina(String titulo, String descricao, String imagem, String url, String site, String altImagem) {
        StringBuilder h = new StringBuilder(1024);
        h.append("<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n");
        h.append("<title>").append(e(titulo)).append(" | ").append(e(site)).append("</title>\n");
        meta(h, "name", "description", descricao);
        meta(h, "property", "og:type", "website");
        meta(h, "property", "og:locale", "pt_BR");
        meta(h, "property", "og:site_name", site);
        meta(h, "property", "og:title", titulo);
        meta(h, "property", "og:description", descricao);
        meta(h, "property", "og:url", url);
        if (imagem != null) {
            meta(h, "property", "og:image", imagem);
            if (imagem.startsWith("https://")) {
                meta(h, "property", "og:image:secure_url", imagem);
            }
            meta(h, "property", "og:image:alt", altImagem);
            meta(h, "name", "twitter:card", "summary_large_image");
            meta(h, "name", "twitter:image", imagem);
        } else {
            meta(h, "name", "twitter:card", "summary");
        }
        meta(h, "name", "twitter:title", titulo);
        meta(h, "name", "twitter:description", descricao);
        h.append("<link rel=\"canonical\" href=\"").append(e(url)).append("\">\n");
        h.append("</head>\n<body>\n<p><a href=\"").append(e(url)).append("\">").append(e(titulo)).append("</a></p>\n");
        h.append("<p>").append(e(descricao)).append("</p>\n</body>\n</html>\n");
        return h.toString();
    }

    private static void meta(StringBuilder h, String atributo, String nome, String valor) {
        h.append("<meta ").append(atributo).append("=\"").append(nome).append("\" content=\"").append(e(valor)).append("\">\n");
    }

    /** Endereço absoluto: os robôs não resolvem caminhos relativos (ex.: /app/public/uploads/...). */
    static String absoluta(String url, String base) {
        if (!preenchido(url)) {
            return null;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return base + (url.startsWith("/") ? url : "/" + url);
    }

    private static String moeda(BigDecimal v) {
        return NumberFormat.getCurrencyInstance(PT_BR).format(v).replace(' ', ' ');
    }

    private static String plural(int n, String um, String varios) {
        return n + " " + (n == 1 ? um : varios);
    }

    private static boolean preenchido(String s) {
        return s != null && !s.isBlank();
    }

    private static String e(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s, "UTF-8");
    }
}
