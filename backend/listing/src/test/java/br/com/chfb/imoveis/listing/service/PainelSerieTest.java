package br.com.chfb.imoveis.listing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.listing.dto.PainelAnuncios.PontoDia;

class PainelSerieTest {

    @Test
    void preencheDiasSemMovimentoComZero() {
        LocalDate d1 = LocalDate.of(2026, 11, 1);
        List<PontoDia> serie = PainelService.serie(Map.of(d1.plusDays(1), 5L), d1, d1.plusDays(2));

        assertEquals(List.of(new PontoDia(d1, 0), new PontoDia(d1.plusDays(1), 5), new PontoDia(d1.plusDays(2), 0)), serie);
    }
}
