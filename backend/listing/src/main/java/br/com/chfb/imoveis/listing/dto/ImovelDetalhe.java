package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;

/** Dados completos de um anúncio (página do imóvel e edição). */
public record ImovelDetalhe(
        Long id,
        String codigo,
        String titulo,
        String descricao,
        Finalidade finalidade,
        TipoImovel tipo,
        String tipoDescricao,
        StatusAnuncio status,
        BigDecimal preco,
        BigDecimal condominio,
        BigDecimal iptu,
        BigDecimal areaUtil,
        BigDecimal areaTotal,
        Integer quartos,
        Integer suites,
        Integer banheiros,
        Integer vagas,
        String uf,
        String cidade,
        String bairro,
        String endereco,
        String numero,
        String cep,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean lancamento,
        boolean destaque,
        boolean aceitaFinanciamento,
        boolean aceitaFgts,
        boolean aceitaPermuta,
        boolean escrituraRegistrada,
        boolean quitado,
        List<FotoDto> fotos,
        Set<String> caracteristicas,
        long visualizacoes,
        Anunciante anunciante,
        Instant criadoEm,
        Instant atualizadoEm) {

    public record Anunciante(Long id, String nome, String telefone, String creci, String fotoUrl) {
    }
}
