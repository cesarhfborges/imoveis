package br.com.chfb.imoveis.coreapi.dto;

import br.com.chfb.imoveis.listing.dto.EstatisticasAnuncios;

public record DashboardDto(long usuarios, long clientes, long corretores, long administradores,
        EstatisticasAnuncios anuncios) {
}
