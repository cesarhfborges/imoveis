package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.time.Instant;

import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;

/** Dados de um anúncio para cartões e listas. */
public record ImovelResumo(
        Long id,
        String codigo,
        String titulo,
        Finalidade finalidade,
        TipoImovel tipo,
        String tipoDescricao,
        StatusAnuncio status,
        BigDecimal preco,
        BigDecimal condominio,
        BigDecimal areaUtil,
        Integer quartos,
        Integer suites,
        Integer banheiros,
        Integer vagas,
        String uf,
        String cidade,
        String bairro,
        String endereco,
        String numero,
        BigDecimal latitude,
        BigDecimal longitude,
        String descricaoCurta,
        String anuncianteCreci,
        String anuncianteFoto,
        String fotoCapa,
        boolean fotoCapaIa,
        int totalFotos,
        boolean lancamento,
        boolean destaque,
        boolean aceitaFinanciamento,
        boolean aceitaFgts,
        long visualizacoes,
        Long anuncianteId,
        String anuncianteNome,
        Instant criadoEm) {
}
