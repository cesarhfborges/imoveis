package br.com.chfb.imoveis.listing.dto;

import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import jakarta.validation.constraints.NotNull;

public record StatusForm(@NotNull StatusAnuncio status, Boolean destaque) {
}
