package br.com.chfb.imoveis.listing.entity;

/**
 * Condições do anúncio que dependem da finalidade. Cada uma só vale para a finalidade indicada; ao salvar,
 * as de outra finalidade são descartadas. Os textos exibidos ficam no front (CONDICOES em models.ts).
 */
public enum CondicaoAnuncio {
    // Venda (além das colunas aceitaFinanciamento, aceitaFgts, aceitaPermuta, escrituraRegistrada e quitado)
    ACEITA_CONSORCIO(Finalidade.VENDA),
    POSSUI_HABITESE(Finalidade.VENDA),
    CONSTRUCAO_AVERBADA(Finalidade.VENDA),
    ACEITA_PROPOSTA(Finalidade.VENDA),

    // Aluguel: garantias aceitas
    GARANTIA_FIADOR(Finalidade.ALUGUEL),
    GARANTIA_CAUCAO(Finalidade.ALUGUEL),
    GARANTIA_SEGURO_FIANCA(Finalidade.ALUGUEL),
    GARANTIA_TITULO_CAPITALIZACAO(Finalidade.ALUGUEL),
    SEM_GARANTIA(Finalidade.ALUGUEL),
    // Aluguel: o que está incluso no valor
    ALUGUEL_CONDOMINIO_INCLUSO(Finalidade.ALUGUEL),
    ALUGUEL_IPTU_INCLUSO(Finalidade.ALUGUEL),
    ALUGUEL_AGUA_INCLUSA(Finalidade.ALUGUEL),
    ALUGUEL_INTERNET_INCLUSA(Finalidade.ALUGUEL),
    // Aluguel: regras
    ALUGUEL_ACEITA_PET(Finalidade.ALUGUEL),
    ALUGUEL_MOBILIADO(Finalidade.ALUGUEL),
    DISPONIVEL_IMEDIATO(Finalidade.ALUGUEL),

    // Temporada: o que está incluso
    TEMPORADA_ROUPA_CAMA_BANHO(Finalidade.TEMPORADA),
    TEMPORADA_WIFI(Finalidade.TEMPORADA),
    TEMPORADA_COZINHA_EQUIPADA(Finalidade.TEMPORADA),
    TEMPORADA_LIMPEZA_INCLUSA(Finalidade.TEMPORADA),
    // Temporada: regras da casa
    TEMPORADA_ACEITA_PET(Finalidade.TEMPORADA),
    TEMPORADA_PERMITE_EVENTOS(Finalidade.TEMPORADA),
    TEMPORADA_PERMITE_FUMAR(Finalidade.TEMPORADA),
    TEMPORADA_CANCELAMENTO_GRATIS(Finalidade.TEMPORADA);

    private final Finalidade finalidade;

    CondicaoAnuncio(Finalidade finalidade) {
        this.finalidade = finalidade;
    }

    public Finalidade getFinalidade() {
        return finalidade;
    }
}
