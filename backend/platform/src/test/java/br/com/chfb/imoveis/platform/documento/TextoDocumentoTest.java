package br.com.chfb.imoveis.platform.documento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.sharedkernel.security.Perfil;

class TextoDocumentoTest {

    @Test
    void mantemFormatacaoDoEditorCompleto() {
        String html = "<h2 class=\"ql-align-center\">Título</h2><p class=\"ql-indent-1\"><span style=\"color: rgb(230, 0, 0);\">vermelho</span> <sub>2</sub></p>"
                + "<table><tbody><tr><td data-row=\"row-1\">célula</td></tr></tbody></table>";
        String limpo = TextoDocumento.limpar(html);
        assertTrue(limpo.contains("<h2 class=\"ql-align-center\">"));
        assertTrue(limpo.contains("class=\"ql-indent-1\""));
        assertTrue(limpo.contains("style=\"color: rgb(230, 0, 0)\""));
        assertTrue(limpo.contains("<sub>2</sub>"));
        assertTrue(limpo.contains("<td data-row=\"row-1\">célula</td>"));
    }

    @Test
    void removeScriptsEventosEstilosEClassesEstranhas() {
        String html = "<p onclick=\"x()\" class=\"ql-align-right perigo\" style=\"position:fixed\">ok</p><script>alert(1)</script>"
                + "<span style=\"color: red; background: url(javascript:x)\">a</span><iframe src=\"https://x\"></iframe>"
                + "<img src=\"data:image/png;base64,AAA\"><a href=\"javascript:alert(1)\">link</a>";
        String limpo = TextoDocumento.limpar(html);
        assertFalse(limpo.contains("onclick"));
        assertFalse(limpo.contains("script"));
        assertFalse(limpo.contains("iframe"));
        assertFalse(limpo.contains("perigo"));
        assertFalse(limpo.contains("position"));
        assertFalse(limpo.contains("javascript"));
        assertFalse(limpo.contains("data:image"));
        assertTrue(limpo.contains("<p class=\"ql-align-right\">ok</p>"));
    }

    @Test
    void linkExternoAbreEmNovaAba() {
        String limpo = TextoDocumento.limpar("<p><a href=\"https://gov.br\">LGPD</a></p>");
        assertTrue(limpo.contains("target=\"_blank\""));
        assertTrue(limpo.contains("rel=\"noopener noreferrer nofollow\""));
    }

    @Test
    void trocaEspacoNaoSeparavelPorEspacoNormal() {
        String limpo = TextoDocumento.limpar("<p>Bem-vindo&nbsp;ao&nbsp;<strong>Imóveis&nbsp;Brasil</strong>.</p>");
        assertEquals("<p>Bem-vindo ao <strong>Imóveis Brasil</strong>.</p>", limpo);
    }

    @Test
    void conteudoVazio() {
        assertTrue(TextoDocumento.vazio("<p><br></p>"));
        assertFalse(TextoDocumento.vazio("<p>texto</p>"));
        assertEquals("", TextoDocumento.limpar(null));
    }

    @Test
    void perfilDoAceite() {
        assertTrue(PerfilAceite.TODOS.vale(Perfil.CLIENTE));
        assertTrue(PerfilAceite.CORRETOR.vale(Perfil.CORRETOR));
        assertFalse(PerfilAceite.CORRETOR.vale(Perfil.CLIENTE));
        assertFalse(PerfilAceite.TODOS.vale(Perfil.ADMIN));
    }
}
