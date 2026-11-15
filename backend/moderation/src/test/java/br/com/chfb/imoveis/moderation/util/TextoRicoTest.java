package br.com.chfb.imoveis.moderation.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.chfb.imoveis.platform.texto.TextoRico;
import org.junit.jupiter.api.Test;

class TextoRicoTest {

    @Test
    void removeScriptsEventosELinksPerigosos() {
        String limpo = TextoRico.limpar("<p onclick=\"x()\">Oi <script>alert(1)</script><img src=x onerror=alert(1)>"
                + "<a href=\"javascript:alert(1)\">a</a> <a href=\"https://site.com\">b</a></p>");
        assertFalse(limpo.contains("script"));
        assertFalse(limpo.contains("onclick"));
        assertFalse(limpo.contains("onerror"));
        assertFalse(limpo.contains("<img"));
        assertFalse(limpo.contains("javascript:"));
        assertTrue(limpo.contains("href=\"https://site.com\""));
        assertTrue(limpo.contains("rel=\"noopener noreferrer nofollow\""));
    }

    @Test
    void mantemFormatacaoDoEditor() {
        String html = "<p><strong>Negrito</strong> e <em>itálico</em></p><ol><li data-list=\"bullet\">item</li></ol>";
        assertEquals(html, TextoRico.limpar(html));
    }

    @Test
    void textoSimplesViraParagrafoEscapado() {
        assertEquals("<p>linha 1<br>linha 2</p>", TextoRico.limpar("linha 1\nlinha 2"));
    }

    @Test
    void vazioDoEditorEhVazio() {
        assertTrue(TextoRico.vazio("<p><br></p>"));
        assertTrue(TextoRico.vazio("<p>   </p>"));
        assertFalse(TextoRico.vazio("<p>ok</p>"));
        assertEquals("Negrito e itálico", TextoRico.texto("<p><strong>Negrito</strong> e itálico</p>"));
    }
}
