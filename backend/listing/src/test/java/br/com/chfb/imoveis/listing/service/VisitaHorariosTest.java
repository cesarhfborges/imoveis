package br.com.chfb.imoveis.listing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.listing.dto.VisitaDtos.DiaHorarios;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.listing.repository.VisitaRepository;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.HorarioComercial;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;

/** Horários oferecidos: só dentro do expediente, com antecedência mínima e sem os horários já tomados. */
class VisitaHorariosTest {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    /** Expediente fictício: segunda a sexta, das 8h às 18h. */
    private static final HorarioComercial EXPEDIENTE = new HorarioComercial() {
        @Override
        public ZoneId fuso() {
            return FUSO;
        }

        @Override
        public boolean dentroDoExpediente(Instant inicio, Instant fim) {
            ZonedDateTime i = inicio.atZone(FUSO), f = fim.atZone(FUSO);
            boolean util = i.getDayOfWeek() != DayOfWeek.SATURDAY && i.getDayOfWeek() != DayOfWeek.SUNDAY;
            int minutoInicio = i.getHour() * 60 + i.getMinute();
            int minutoFim = minutoInicio + (int) java.time.Duration.between(i, f).toMinutes();
            return util && minutoInicio >= 8 * 60 && minutoFim <= 18 * 60;
        }
    };

    @Test
    void ofereceSoHorariosLivresNoExpediente() {
        VisitaRepository visitas = mock(VisitaRepository.class);
        ImovelRepository imoveis = mock(ImovelRepository.class);
        RecursosSitePolicy recursos = mock(RecursosSitePolicy.class);
        when(recursos.agendamentoVisita()).thenReturn(true);
        Imovel imovel = new Imovel();
        imovel.setStatus(StatusAnuncio.ATIVO);
        imovel.setAnuncianteId(9L);
        when(imoveis.findById(anyLong())).thenReturn(Optional.of(imovel));

        // a próxima segunda às 10h já está tomada
        LocalDate segunda = LocalDate.now(FUSO).plusDays(1);
        while (segunda.getDayOfWeek() != DayOfWeek.MONDAY) {
            segunda = segunda.plusDays(1);
        }
        Instant tomado = segunda.atTime(10, 0).atZone(FUSO).toInstant();
        when(visitas.ocupados(any(), any(), any(), any(), any())).thenReturn(List.of(tomado));

        VisitaService s = new VisitaService(visitas, imoveis, EXPEDIENTE, mock(Notificador.class),
                mock(AnuncianteProvider.class), recursos);
        List<DiaHorarios> dias = s.horarios(1L);

        assertFalse(dias.isEmpty());
        assertTrue(dias.stream().noneMatch(d -> d.dia().getDayOfWeek() == DayOfWeek.SATURDAY || d.dia().getDayOfWeek() == DayOfWeek.SUNDAY));
        LocalDate seg = segunda;
        DiaHorarios diaSegunda = dias.stream().filter(d -> d.dia().equals(seg)).findFirst().orElseThrow();
        // 8h às 17h (a última visita termina às 18h) = 10 blocos, menos o das 10h
        assertEquals(9, diaSegunda.horarios().size());
        assertFalse(diaSegunda.horarios().contains(tomado));
        Instant minimo = Instant.now().plus(VisitaService.ANTECEDENCIA);
        assertTrue(dias.stream().flatMap(d -> d.horarios().stream()).noneMatch(h -> h.isBefore(minimo)));
    }
}
