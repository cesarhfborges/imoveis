package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.TipoImovel;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Dados enviados para criar ou editar um anúncio. */
public record ImovelForm(
        @NotBlank @Size(max = 160) String titulo,
        @Size(max = 10000) String descricao,
        @NotNull Finalidade finalidade,
        @NotNull TipoImovel tipo,
        @NotNull @DecimalMin("0.0") BigDecimal preco,
        @DecimalMin("0.0") BigDecimal condominio,
        @DecimalMin("0.0") BigDecimal iptu,
        @DecimalMin("0.0") BigDecimal areaUtil,
        @DecimalMin("0.0") BigDecimal areaTotal,
        @Min(0) @Max(50) Integer quartos,
        @Min(0) @Max(50) Integer suites,
        @Min(0) @Max(50) Integer banheiros,
        @Min(0) @Max(200) Integer vagas,
        @NotBlank @Pattern(regexp = "[A-Za-z]{2}") String uf,
        @NotBlank @Size(max = 80) String cidade,
        @NotBlank @Size(max = 80) String bairro,
        @Size(max = 200) String endereco,
        @Size(max = 9) String cep,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        boolean lancamento,
        boolean aceitaFinanciamento,
        @Size(max = 30) List<@Size(max = 500) String> fotos,
        @Size(max = 40) Set<@Size(max = 60) String> caracteristicas) {
}
