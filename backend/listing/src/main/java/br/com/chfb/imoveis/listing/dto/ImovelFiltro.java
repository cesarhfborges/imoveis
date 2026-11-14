package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.util.List;

import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;

/**
 * Filtros da busca. Todos opcionais.
 *
 * @param q          texto livre (título, bairro, cidade, código)
 * @param ordem      recentes | menor-preco | maior-preco | maior-area | relevancia
 * @param status     só usado nas rotas administrativas
 * @param anunciante só usado nas rotas administrativas
 */
public record ImovelFiltro(
        String q,
        Finalidade finalidade,
        List<TipoImovel> tipo,
        String uf,
        String cidade,
        String bairro,
        Integer quartos,
        Integer vagas,
        Integer suites,
        BigDecimal precoMin,
        BigDecimal precoMax,
        BigDecimal areaMin,
        BigDecimal areaMax,
        Boolean lancamento,
        Boolean destaque,
        StatusAnuncio status,
        Long anunciante,
        String ordem,
        Integer page,
        Integer size) {

    public int paginaOuPadrao() {
        return page == null || page < 0 ? 0 : page;
    }

    public int tamanhoOuPadrao() {
        if (size == null || size <= 0) {
            return 12;
        }
        return Math.min(size, 60);
    }
}
