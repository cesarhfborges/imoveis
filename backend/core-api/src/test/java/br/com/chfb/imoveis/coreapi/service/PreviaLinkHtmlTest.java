package br.com.chfb.imoveis.coreapi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.listing.dto.FotoDto;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.OrigemFoto;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;

class PreviaLinkHtmlTest {

    private static final String BASE = "https://imoveis.exemplo.com.br";

    @Test
    void usaFotoDeCapaComEnderecoAbsoluto() {
        String html = PreviaLinkHtml.doImovel(imovel(Finalidade.VENDA, "Asa Norte", List.of(
                new FotoDto("/app/public/uploads/capa.jpg", OrigemFoto.REAL),
                new FotoDto("/app/public/uploads/outra.jpg", OrigemFoto.REAL))), BASE, "Imóveis", "/logo.png");

        assertTrue(html.contains("<meta property=\"og:image\" content=\"https://imoveis.exemplo.com.br/app/public/uploads/capa.jpg\">"));
        assertTrue(html.contains("<meta property=\"og:url\" content=\"https://imoveis.exemplo.com.br/imovel/665\">"));
        assertTrue(html.contains("summary_large_image"));
        assertFalse(html.contains("logo.png"));
    }

    @Test
    void semFotoUsaImagemDoSite() {
        String html = PreviaLinkHtml.doImovel(imovel(Finalidade.VENDA, "Asa Norte", List.of()), BASE, "Imóveis", "/logo.png");

        assertTrue(html.contains("<meta property=\"og:image\" content=\"https://imoveis.exemplo.com.br/logo.png\">"));
    }

    @Test
    void tituloEDescricaoConformeAFinalidade() {
        ImovelDetalhe venda = imovel(Finalidade.VENDA, "Asa Norte", List.of());
        assertEquals("Apartamento à venda em Asa Norte, Brasília/DF", PreviaLinkHtml.titulo(venda));
        assertEquals("R$ 540.000,00 · 74 m² · 2 quartos (1 suíte) · 1 vaga · cód. IM-000665", PreviaLinkHtml.descricao(venda));

        ImovelDetalhe aluguel = imovel(Finalidade.ALUGUEL, "Asa Norte", List.of());
        assertEquals("Apartamento para alugar em Asa Norte, Brasília/DF", PreviaLinkHtml.titulo(aluguel));
        assertTrue(PreviaLinkHtml.descricao(aluguel).startsWith("R$ 540.000,00/mês"));

        ImovelDetalhe temporada = imovel(Finalidade.TEMPORADA, "Asa Norte", List.of());
        assertTrue(PreviaLinkHtml.titulo(temporada).contains("para temporada"));
        assertTrue(PreviaLinkHtml.descricao(temporada).startsWith("R$ 540.000,00/dia"));
    }

    @Test
    void escapaTextoDoAnunciante() {
        String html = PreviaLinkHtml.doImovel(imovel(Finalidade.VENDA, "\"><script>alert(1)</script>", List.of()), BASE, "Imóveis", null);

        assertFalse(html.contains("<script>"));
        assertTrue(html.contains("&quot;&gt;&lt;script&gt;"));
    }

    private static ImovelDetalhe imovel(Finalidade finalidade, String bairro, List<FotoDto> fotos) {
        return new ImovelDetalhe(665L, "IM-000665", "Sala ampla", "Descrição", finalidade, TipoImovel.APARTAMENTO, "Apartamento",
                StatusAnuncio.ATIVO, new BigDecimal("540000.00"), null, null, new BigDecimal("74"), null, 2, 1, 1, 1,
                "DF", "Brasília", bairro, "Rua 12", null, null, null, null,
                false, false, false, false, false, false, false, Set.of(), null, null, null, null, null, null,
                false, List.of(), List.of(), fotos, Set.of(), 0, null, Instant.now(), Instant.now());
    }
}
