package br.com.chfb.imoveis.platform.calendario;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.stereotype.Component;

import br.com.chfb.imoveis.sharedkernel.port.HorarioComercial;

/** Implementa {@link HorarioComercial} com o calendário do site (expediente e feriados). */
@Component
public class CalendarioHorarioComercial implements HorarioComercial {

    private final CalendarioService calendario;

    public CalendarioHorarioComercial(CalendarioService calendario) {
        this.calendario = calendario;
    }

    @Override
    public ZoneId fuso() {
        return calendario.atual().fuso();
    }

    @Override
    public boolean dentroDoExpediente(Instant inicio, Instant fim) {
        CalendarioUteis c = calendario.atual();
        // começa no expediente e todos os minutos até o fim são úteis (nenhum feriado ou fim de expediente no meio)
        return c.emExpediente(inicio) && c.segundosUteisEntre(inicio, fim) >= Duration.between(inicio, fim).toSeconds();
    }
}
