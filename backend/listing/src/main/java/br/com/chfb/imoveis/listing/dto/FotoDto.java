package br.com.chfb.imoveis.listing.dto;

import br.com.chfb.imoveis.listing.entity.FotoImovel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Foto do anúncio (entrada e saída).
 *
 * @param editadaIa true = imagem criada/alterada com IA; false = foto real sem alterações
 */
public record FotoDto(@NotBlank @Size(max = 500) String url, boolean editadaIa) {

    public static FotoDto of(FotoImovel f) {
        return new FotoDto(f.getUrl(), f.isEditadaIa());
    }
}
