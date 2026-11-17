package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import br.com.chfb.imoveis.listing.dto.PainelAnuncios.PontoDia;

/**
 * Relatório de um anúncio no período (7, 30 ou 90 dias), comparado com o período anterior e com a média dos outros
 * anúncios ativos do mesmo anunciante.
 *
 * @param periodo      dias do período
 * @param anuncio      dados do anúncio
 * @param resumo       totais do período e do anterior
 * @param comparacao   média dos outros anúncios ativos do anunciante no mesmo período (nula se ele não tiver outros)
 * @param visitasPorDia, contatosPorDia, favoritosPorDia séries diárias contínuas do período
 * @param precos       mudanças de preço, da mais recente para a mais antiga
 */
public record RelatorioAnuncio(int periodo, Anuncio anuncio, Resumo resumo, Comparacao comparacao,
        List<PontoDia> visitasPorDia, List<PontoDia> contatosPorDia, List<PontoDia> favoritosPorDia,
        List<MudancaPreco> precos) {

    /** @param diasNoAr dias desde a criação do anúncio */
    public record Anuncio(Long id, String codigo, String titulo, String status, BigDecimal preco, Instant criadoEm,
            long diasNoAr, long visualizacoesTotal, long favoritosAtuais) {
    }

    public record Resumo(long visitas, long visitasAnterior, long contatos, long contatosAnterior, long favoritos,
            long favoritosAnterior) {
    }

    /** @param anuncios quantos outros anúncios entraram na média */
    public record Comparacao(double mediaVisitas, double mediaContatos, long anuncios) {
    }

    public record MudancaPreco(Instant em, BigDecimal anterior, BigDecimal novo) {
    }
}
