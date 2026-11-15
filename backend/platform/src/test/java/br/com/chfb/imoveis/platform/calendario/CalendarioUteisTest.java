package br.com.chfb.imoveis.platform.calendario;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.platform.calendario.CalendarioUteis.Expediente;
import br.com.chfb.imoveis.platform.calendario.CalendarioUteis.Feriado;

class CalendarioUteisTest {

    private static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    /** Seg a sex, 08:00 às 18:00. */
    private static Map<DayOfWeek, Expediente> comercial() {
        Map<DayOfWeek, Expediente> m = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek d : DayOfWeek.values()) {
            boolean util = d != DayOfWeek.SATURDAY && d != DayOfWeek.SUNDAY;
            m.put(d, new Expediente(util, 8 * 60, 18 * 60));
        }
        return m;
    }

    private static Instant em(String local) {
        return LocalDateTime.parse(local).atZone(SP).toInstant();
    }

    private static CalendarioUteis cal(List<Feriado> feriados) {
        return new CalendarioUteis(SP, comercial(), feriados);
    }

    @Test
    void sextaAs17ContaUmaHoraEVoltaNaSegundaAs8() {
        // 2026-11-13 é sexta-feira
        assertEquals(em("2026-11-16T09:00"), cal(List.of()).somarMinutosUteis(em("2026-11-13T17:00"), 120));
    }

    @Test
    void comecandoNoFimDeSemanaSoContaNaSegunda() {
        assertEquals(em("2026-11-16T08:30"), cal(List.of()).somarMinutosUteis(em("2026-11-14T10:00"), 30));
    }

    @Test
    void comecandoAntesDoExpedienteEsperaAbrir() {
        assertEquals(em("2026-11-17T08:15"), cal(List.of()).somarMinutosUteis(em("2026-11-17T06:00"), 15));
    }

    @Test
    void prazoQueTerminaExatamenteNoFimDoExpediente() {
        assertEquals(em("2026-11-17T18:00"), cal(List.of()).somarMinutosUteis(em("2026-11-17T17:00"), 60));
    }

    @Test
    void vesperaDeNatalAPartirDas13ENatalInteiroRecorrentes() {
        List<Feriado> natal = List.of(
                new Feriado(LocalDateTime.parse("2020-12-24T13:00"), LocalDateTime.parse("2020-12-25T00:00"), true),
                new Feriado(LocalDateTime.parse("2020-12-25T00:00"), LocalDateTime.parse("2020-12-26T00:00"), true));
        // 2026-12-24 é quinta: 12:00 às 13:00 conta 60 min; sexta 25 é feriado; sáb/dom sem expediente; seg 28 conta o resto
        assertEquals(em("2026-12-28T09:00"), cal(natal).somarMinutosUteis(em("2026-12-24T12:00"), 120));
    }

    @Test
    void feriadoRecorrenteQueViraOAno() {
        List<Feriado> reveillon = List.of(
                new Feriado(LocalDateTime.parse("2024-12-31T14:00"), LocalDateTime.parse("2025-01-02T00:00"), true));
        // 2026-12-31 é quinta: 13:00 às 14:00 conta 60; sexta 01/01/2027 feriado; seg 04/01 conta o resto
        assertEquals(em("2027-01-04T08:30"), cal(reveillon).somarMinutosUteis(em("2026-12-31T13:00"), 90));
    }

    @Test
    void feriadoNoMeioDoDiaPartaOExpediente() {
        List<Feriado> parada = List.of(
                new Feriado(LocalDateTime.parse("2026-11-17T12:00"), LocalDateTime.parse("2026-11-17T14:00"), false));
        assertEquals(em("2026-11-17T14:30"), cal(parada).somarMinutosUteis(em("2026-11-17T11:00"), 90));
        assertEquals(90, cal(parada).minutosUteisEntre(em("2026-11-17T11:00"), em("2026-11-17T14:30")));
    }

    @Test
    void minutosUteisEntreAtravessandoOFimDeSemana() {
        assertEquals(120, cal(List.of()).minutosUteisEntre(em("2026-11-13T17:00"), em("2026-11-16T09:00")));
        assertEquals(0, cal(List.of()).minutosUteisEntre(em("2026-11-16T09:00"), em("2026-11-13T17:00")));
    }

    @Test
    void proximoMomentoUtilEExpediente() {
        CalendarioUteis c = cal(List.of());
        assertEquals(em("2026-11-16T08:00"), c.proximoMomentoUtil(em("2026-11-13T19:00")));
        assertTrue(c.emExpediente(em("2026-11-16T10:00")));
        assertFalse(c.emExpediente(em("2026-11-15T10:00")));
    }

    @Test
    void expedienteAte24h() {
        Map<DayOfWeek, Expediente> sempre = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek d : DayOfWeek.values()) {
            sempre.put(d, new Expediente(true, 0, 24 * 60));
        }
        CalendarioUteis c = new CalendarioUteis(SP, sempre, List.of());
        assertEquals(em("2026-11-15T01:30"), c.somarMinutosUteis(em("2026-11-14T23:30"), 120));
    }

    @Test
    void semExpedienteNaoHaPrazo() {
        Map<DayOfWeek, Expediente> fechado = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek d : DayOfWeek.values()) {
            fechado.put(d, new Expediente(false, 8 * 60, 18 * 60));
        }
        CalendarioUteis c = new CalendarioUteis(SP, fechado, List.of());
        assertFalse(c.temExpediente());
        assertNull(c.somarMinutosUteis(em("2026-11-16T09:00"), 10));
    }
}
