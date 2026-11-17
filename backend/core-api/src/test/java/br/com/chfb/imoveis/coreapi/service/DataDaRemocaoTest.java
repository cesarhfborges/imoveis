package br.com.chfb.imoveis.coreapi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.junit.jupiter.api.Test;

/** A conta é apagada na primeira execução das 03:00 depois de cumprido o prazo de espera. */
class DataDaRemocaoTest {

    private static final ZoneId BRASILIA = ZoneId.of("America/Sao_Paulo");

    private static Instant em(int dia, int hora, int minuto) {
        return ZonedDateTime.of(2026, 11, dia, hora, minuto, 0, 0, BRASILIA).toInstant();
    }

    @Test
    void pedidoDeTardeVaiParaAMadrugadaSeguinteAoPrazo() {
        // 17/11 14h + 1 dia = 18/11 14h → a próxima execução é 19/11 às 03:00
        assertEquals(em(19, 3, 0), SolicitacaoExclusaoService.dataDaRemocao(em(17, 14, 0), 1));
    }

    @Test
    void pedidoDeMadrugadaAntesDasTres() {
        // 17/11 02h + 2 dias = 19/11 02h → 19/11 às 03:00
        assertEquals(em(19, 3, 0), SolicitacaoExclusaoService.dataDaRemocao(em(17, 2, 0), 2));
    }

    @Test
    void pedidoExatamenteAsTres() {
        assertEquals(em(24, 3, 0), SolicitacaoExclusaoService.dataDaRemocao(em(17, 3, 0), 7));
    }
}
