package br.com.chfb.imoveis.platform.documento;

import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;

/**
 * HTML de documento (editor completo do Quill): títulos, tabelas, cores, alinhamento, recuo, código, imagens.
 * Mais permissivo que o TextoRico, mas sem scripts, iframes, eventos ou estilos arbitrários: de "class" só ficam
 * as classes do Quill (ql-*) e de "style" só cor e fundo com valor de cor.
 */
public final class TextoDocumento {

    private static final String[] COM_CLASSE = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "span", "div", "blockquote", "pre", "td", "th", "img", "ol", "ul"};

    private static final Safelist PERMITIDO = Safelist.none()
            .addTags("p", "br", "hr", "strong", "b", "em", "i", "u", "s", "sub", "sup", "span", "div", "code", "pre",
                    "h1", "h2", "h3", "h4", "h5", "h6", "ol", "ul", "li", "blockquote", "a", "img",
                    "table", "thead", "tbody", "tr", "td", "th")
            .addAttributes("li", "data-list")
            .addAttributes("td", "data-row", "colspan", "rowspan")
            .addAttributes("th", "data-row", "colspan", "rowspan")
            .addAttributes("div", "data-language")
            .addAttributes("pre", "data-language")
            .addAttributes("span", "style")
            .addAttributes("strong", "style")
            .addAttributes("em", "style")
            .addAttributes("u", "style")
            .addAttributes("s", "style")
            .addAttributes("a", "style")
            .addAttributes("a", "href")
            .addAttributes("img", "src", "alt", "width", "height")
            .addProtocols("a", "href", "http", "https", "mailto", "tel")
            .addProtocols("img", "src", "http", "https")
            .addEnforcedAttribute("a", "rel", "noopener noreferrer nofollow")
            .preserveRelativeLinks(true);

    static {
        for (String tag : COM_CLASSE) {
            PERMITIDO.addAttributes(tag, "class");
        }
    }

    private static final Pattern CLASSE_QUILL = Pattern.compile("^ql-[a-z0-9-]+$");
    private static final Pattern COR = Pattern.compile("^(#[0-9a-fA-F]{3,8}|rgba?\\([\\d\\s.,%]+\\))$");

    private TextoDocumento() {
    }

    public static String limpar(String entrada) {
        if (entrada == null || entrada.isBlank()) {
            return "";
        }
        Document sujo = Jsoup.parseBodyFragment(entrada, "http://local/");
        Document limpo = new Cleaner(PERMITIDO).clean(sujo);
        for (Element e : limpo.body().getAllElements()) {
            if (e.hasAttr("class")) {
                String classes = Arrays.stream(e.attr("class").split("\\s+")).filter(c -> CLASSE_QUILL.matcher(c).matches())
                        .collect(Collectors.joining(" "));
                if (classes.isEmpty()) e.removeAttr("class"); else e.attr("class", classes);
            }
            if (e.hasAttr("style")) {
                String estilo = Arrays.stream(e.attr("style").split(";")).map(String::trim).filter(d -> {
                    int i = d.indexOf(':');
                    if (i < 0) return false;
                    String prop = d.substring(0, i).trim().toLowerCase();
                    String valor = d.substring(i + 1).trim();
                    return (prop.equals("color") || prop.equals("background-color")) && COR.matcher(valor).matches();
                }).collect(Collectors.joining("; "));
                if (estilo.isEmpty()) e.removeAttr("style"); else e.attr("style", estilo);
            }
            // links externos abrem em nova aba; âncoras internas (#secao) não
            if (e.tagName().equals("a") && e.attr("href").startsWith("http")) {
                e.attr("target", "_blank");
            }
        }
        // texto colado do Word/Docs/chat costuma vir com todo espaço como &nbsp; (U+00A0): cada parágrafo vira uma
        // "palavra" só, que não quebra linha e vaza da página. Documento não precisa de espaço não separável.
        for (Element e : limpo.body().getAllElements()) {
            for (TextNode t : e.textNodes()) {
                if (t.getWholeText().indexOf('\u00A0') >= 0) {
                    t.text(t.getWholeText().replace('\u00A0', ' '));
                }
            }
        }
        limpo.outputSettings().prettyPrint(false);
        return limpo.body().html().strip();
    }

    public static boolean vazio(String html) {
        return html == null || Jsoup.parse(html).text().isBlank() && !html.contains("<img") && !html.contains("<table");
    }
}
