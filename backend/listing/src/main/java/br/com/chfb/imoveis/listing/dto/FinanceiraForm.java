package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;

import br.com.chfb.imoveis.listing.entity.SistemaAmortizacao;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cadastro/edição de financeira pela administração. */
public record FinanceiraForm(
        @NotBlank @Size(max = 80) String nome,
        @Size(max = 500) String descricao,
        @Size(max = 500) String logoUrl,
        boolean ativo,
        @NotNull SistemaAmortizacao sistemaAmortizacao,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal taxaJurosAnual,
        @Min(12) @Max(480) int prazoMaximoMeses,
        @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal entradaMinimaPercentual,
        @NotNull @DecimalMin("1.0") @DecimalMax("100.0") BigDecimal comprometimentoRendaPercentual,
        @Min(18) @Max(120) Integer idadeMaximaQuitacao,
        @DecimalMin("0.0") BigDecimal valorMinimoImovel,
        @DecimalMin("0.0") BigDecimal valorMaximoImovel,
        @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal seguroMensalPercentual,
        @DecimalMin("0.0") BigDecimal taxaAdministracaoMensal,
        boolean aceitaFgts,
        @Size(max = 1000) String observacoes) {
}
