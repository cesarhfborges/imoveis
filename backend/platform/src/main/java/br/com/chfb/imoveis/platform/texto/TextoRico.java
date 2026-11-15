package br.com.chfb.imoveis.platform.texto;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;
import org.jsoup.safety.Safelist;

/**
 * Texto rico vindo do editor (HTML do Quill): mensagens das pendências, avisos do site etc.
 * Tudo passa por uma lista de tags permitidas antes de gravar: sem scripts, estilos, imagens embutidas
 * ou atributos de evento. Texto simples (sem tags) é convertido para parágrafos.
 */
public final class TextoRico {

    private static final Safelist PERMITIDO = Safelist.none()
            .addTags("p", "br", "strong", "b", "em", "i", "u", "s", "ol", "ul", "li", "blockquote", "a")
            .addAttributes("li", "data-list")
            .addAttributes("a", "href")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addEnforcedAttribute("a", "rel", "noopener noreferrer nofollow")
            .addEnforcedAttribute("a", "target", "_blank");

    private static final Document.OutputSettings SAIDA = new Document.OutputSettings().prettyPrint(false);

    private TextoRico() {
    }

    /** HTML seguro para gravar e exibir. */
    public static String limpar(String entrada) {
        if (entrada == null) {
            return null;
        }
        String html = entrada.contains("<") ? entrada
                : "<p>" + Entities.escape(entrada.strip()).replace("\r\n", "\n").replace("\n", "<br>") + "</p>";
        return Jsoup.clean(html, "", PERMITIDO, SAIDA).strip();
    }

    /** Só o texto (para notificações, contagem de caracteres e verificação de vazio). */
    public static String texto(String html) {
        if (html == null) {
            return "";
        }
        if (!html.contains("<")) {
            return html.strip();
        }
        return Jsoup.parse(html).text().strip();
    }

    public static boolean vazio(String html) {
        return texto(html).isBlank();
    }

    /** Texto curto para notificação. */
    public static String resumo(String html, int max) {
        String t = texto(html);
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }
}
