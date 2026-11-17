package br.com.chfb.imoveis.listing.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Dados dos gráficos do painel. Para o corretor, só os próprios anúncios; para a administração, todos
 * (e {@code visitasPorAnunciante} preenchido — no corretor vem vazio).
 *
 * <p>As séries diárias cobrem o período pedido ({@code dias}), com zero nos dias sem movimento. As distribuições
 * (região, tipo, finalidade, anunciante) usam o total acumulado de visualizações de cada anúncio.</p>
 */
public record PainelAnuncios(
        int dias,
        Resumo resumo,
        List<PontoDia> visitasPorDia,
        List<PontoDia> contatosPorDia,
        List<PontoDia> anunciosNovosPorDia,
        List<Fatia> visitasPorCidade,
        List<Fatia> visitasPorBairro,
        List<Fatia> visitasPorTipo,
        List<Fatia> visitasPorFinalidade,
        List<Fatia> anunciosPorFinalidade,
        List<Fatia> visitasPorAnunciante,
        List<Desempenho> maisVistos) {

    /** Totais do período e do período imediatamente anterior (mesmo tamanho), para a variação. */
    public record Resumo(long visitas, long visitasAnterior, long contatos, long contatosAnterior,
            long favoritos, long visitasAcumuladas, long anunciosAtivos) {
    }

    public record PontoDia(LocalDate dia, long total) {
    }

    public record Fatia(String rotulo, long total) {
    }

    /** Anúncio no ranking: visitas acumuladas, contatos e favoritos recebidos. */
    public record Desempenho(Long id, String codigo, String titulo, String bairro, String cidade, String status,
            long visualizacoes, long contatos, long favoritos) {
    }
}
