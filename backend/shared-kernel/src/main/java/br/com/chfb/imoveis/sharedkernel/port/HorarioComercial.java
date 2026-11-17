package br.com.chfb.imoveis.sharedkernel.port;

import java.time.Instant;
import java.time.ZoneId;

/**
 * Porta do calendário do site (expediente da semana e feriados, em /admin/calendario), implementada no módulo
 * platform. Usada pelo agendamento de visitas para oferecer só horários dentro do expediente.
 */
public interface HorarioComercial {

    ZoneId fuso();

    /** O intervalo inteiro [inicio, fim) cai dentro do expediente, sem feriado nem pausa no meio. */
    boolean dentroDoExpediente(Instant inicio, Instant fim);
}
