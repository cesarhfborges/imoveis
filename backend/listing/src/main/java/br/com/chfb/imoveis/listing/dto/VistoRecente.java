package br.com.chfb.imoveis.listing.dto;

import java.time.Instant;

/** Imóvel do histórico "Vistos recentemente", com quando o usuário o abriu pela última vez. */
public record VistoRecente(ImovelResumo imovel, Instant vistoEm) {
}
