package br.com.chfb.imoveis.coreapi.dto;

import java.util.List;

import br.com.chfb.imoveis.listing.dto.EstatisticasAnuncios;
import br.com.chfb.imoveis.listing.dto.PainelAnuncios.PontoDia;

/** Números gerais do painel administrativo; {@code cadastrosPorDia} cobre o período pedido ({@code dias}). */
public record DashboardDto(long usuarios, long clientes, long corretores, long administradores,
        EstatisticasAnuncios anuncios, List<PontoDia> cadastrosPorDia) {
}
