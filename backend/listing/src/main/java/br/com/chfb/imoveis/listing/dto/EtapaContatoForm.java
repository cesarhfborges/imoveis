package br.com.chfb.imoveis.listing.dto;

import br.com.chfb.imoveis.listing.entity.EtapaContato;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Muda a etapa de um contato recebido; {@code anotacoes} substitui as anotações (nulo ou vazio apaga). */
public record EtapaContatoForm(@NotNull EtapaContato etapa, @Size(max = 4000) String anotacoes) {
}
