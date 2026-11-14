package br.com.chfb.imoveis.listing.dto;

public record EstatisticasAnuncios(long total, long ativos, long pendentes, long pausados, long visualizacoes,
        long contatosNaoLidos) {
}
