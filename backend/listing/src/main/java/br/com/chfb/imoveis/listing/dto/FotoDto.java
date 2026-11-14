package br.com.chfb.imoveis.listing.dto;

import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.OrigemFoto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Foto do anúncio (entrada e saída).
 *
 * @param origem REAL (foto real), IA (criada/alterada com IA) ou NAO_INFORMADO; nulo na entrada vira NAO_INFORMADO
 */
public record FotoDto(@NotBlank @Size(max = 500) String url, OrigemFoto origem) {

    public FotoDto {
        origem = origem == null ? OrigemFoto.NAO_INFORMADO : origem;
    }

    public static FotoDto of(FotoImovel f) {
        return new FotoDto(f.getUrl(), f.getOrigem());
    }
}
