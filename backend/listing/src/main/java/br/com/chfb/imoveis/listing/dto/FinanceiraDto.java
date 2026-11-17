package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;

import br.com.chfb.imoveis.listing.entity.Financeira;
import br.com.chfb.imoveis.listing.entity.SistemaAmortizacao;

/** Financeira e as regras da simulação (mesmo formato na administração e no site). */
public record FinanceiraDto(Long id, String nome, String descricao, String logoUrl, boolean ativo,
        SistemaAmortizacao sistemaAmortizacao, BigDecimal taxaJurosAnual, int prazoMaximoMeses,
        BigDecimal entradaMinimaPercentual, BigDecimal comprometimentoRendaPercentual, Integer idadeMaximaQuitacao,
        BigDecimal valorMinimoImovel, BigDecimal valorMaximoImovel, BigDecimal seguroMensalPercentual,
        BigDecimal taxaAdministracaoMensal, boolean aceitaFgts, String observacoes) {

    public static FinanceiraDto of(Financeira f) {
        return new FinanceiraDto(f.getId(), f.getNome(), f.getDescricao(), f.getLogoUrl(), f.isAtivo(),
                f.getSistemaAmortizacao(), f.getTaxaJurosAnual(), f.getPrazoMaximoMeses(),
                f.getEntradaMinimaPercentual(), f.getComprometimentoRendaPercentual(), f.getIdadeMaximaQuitacao(),
                f.getValorMinimoImovel(), f.getValorMaximoImovel(), f.getSeguroMensalPercentual(),
                f.getTaxaAdministracaoMensal(), f.isAceitaFgts(), f.getObservacoes());
    }
}
