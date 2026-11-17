package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

/** Painel da conta para o perfil cliente (GET /app/conta/painel). */
public record ClientePainel(
        long contatosEnviados,
        long contatosVistos,
        List<AtividadeMes> atividade,
        List<ContatoEnviado> contatosRecentes,
        List<ImovelResumo> vistosRecentes,
        List<ImovelResumo> recomendados,
        Novidades novidades,
        List<QuedaPreco> quedasPreco,
        List<Financiavel> financiamentos) {

    /** mes em "yyyy-MM". */
    public record AtividadeMes(String mes, long favoritos, long contatos) {
    }

    public record ContatoEnviado(Long id, Long imovelId, String imovelCodigo, String imovelTitulo, String bairro,
            String cidade, String imovelStatus, String mensagem, boolean visto, Instant criadoEm, String fotoCapa) {
    }

    /** bairros: "Bairro (Cidade)", base da busca de novidades dos últimos 7 dias. */
    public record Novidades(List<String> bairros, List<ImovelResumo> imoveis) {
    }

    public record QuedaPreco(Long imovelId, String titulo, BigDecimal precoAnterior, BigDecimal precoAtual,
            BigDecimal percentual, Instant alteradoEm) {

        public static QuedaPreco de(Long id, String titulo, BigDecimal anterior, BigDecimal atual, Instant em) {
            BigDecimal pct = anterior.signum() == 0 ? BigDecimal.ZERO
                    : anterior.subtract(atual).multiply(BigDecimal.valueOf(100)).divide(anterior, 1, RoundingMode.HALF_UP);
            return new QuedaPreco(id, titulo, anterior, atual, pct, em);
        }
    }

    /** Favorito à venda com as financeiras disponíveis para simular. */
    public record Financiavel(ImovelResumo imovel, List<FinanceiraDto> financeiras) {
    }
}
