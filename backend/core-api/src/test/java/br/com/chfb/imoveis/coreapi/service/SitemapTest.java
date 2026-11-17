package br.com.chfb.imoveis.coreapi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.sharedkernel.util.Slug;

/** Endereços do sitemap: slug igual ao do front, XML escapado e robots.txt sem expor áreas privadas. */
class SitemapTest {

    @Test
    void slugIgualAoDoFront() {
        assertEquals("apartamento-de-3-quartos-na-asa-sul", Slug.de("Apartamento de 3 quartos na Asa Sul!"));
        assertEquals("casa-com-piscina-area-gourmet", Slug.de("  Casa com piscina & área gourmet  "));
        assertEquals("", Slug.de(null));
        assertEquals(80, Slug.de("a".repeat(120)).length());
    }

    @Test
    void escapaXml() {
        assertEquals("https://x.com/?a=1&amp;b=&lt;2&gt;", SitemapService.escapar("https://x.com/?a=1&b=<2>"));
    }

    @Test
    void robotsBloqueiaAreasPrivadasEAnunciaSitemapSoLigado() {
        SitemapService s = new SitemapService(null, null);
        String ligado = s.robots("https://imoveis.com.br", true);
        assertTrue(ligado.contains("Disallow: /conta"));
        assertTrue(ligado.contains("Disallow: /admin"));
        assertTrue(ligado.contains("Disallow: /api/"));
        assertTrue(ligado.contains("Sitemap: https://imoveis.com.br/sitemap.xml"));
        assertFalse(s.robots("https://imoveis.com.br", false).contains("Sitemap:"));
    }
}
