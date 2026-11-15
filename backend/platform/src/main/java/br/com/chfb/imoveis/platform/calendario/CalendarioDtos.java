package br.com.chfb.imoveis.platform.calendario;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class CalendarioDtos {

    private CalendarioDtos() {
    }

    /** Horário "HH:mm" (de 00:00 a 24:00). */
    static final String HORA = "^(([01]\\d|2[0-3]):[0-5]\\d|24:00)$";

    public record DiaDto(@NotNull @Min(1) @Max(7) Short diaSemana, boolean ativo,
            @NotNull @Pattern(regexp = HORA, message = "use HH:mm") String inicio,
            @NotNull @Pattern(regexp = HORA, message = "use HH:mm") String fim) {

        static DiaDto of(ExpedienteDia d) {
            return new DiaDto(d.getDiaSemana(), d.isAtivo(), hora(d.getInicioMinuto()), hora(d.getFimMinuto()));
        }

        int inicioMinuto() {
            return minutos(inicio);
        }

        int fimMinuto() {
            return minutos(fim);
        }
    }

    static String hora(int minutos) {
        return String.format("%02d:%02d", minutos / 60, minutos % 60);
    }

    static int minutos(String hora) {
        return Integer.parseInt(hora.substring(0, 2)) * 60 + Integer.parseInt(hora.substring(3, 5));
    }

    public record FeriadoDto(Long id, String titulo, LocalDateTime inicio, LocalDateTime fim, boolean recorrente) {

        static FeriadoDto of(Feriado f) {
            return new FeriadoDto(f.getId(), f.getTitulo(), f.getInicio(), f.getFim(), f.isRecorrente());
        }
    }

    public record CalendarioDto(String fuso, List<DiaDto> expediente, List<FeriadoDto> feriados) {
    }

    public record ExpedienteForm(@NotBlank @Size(max = 60) String fuso, @NotNull @Size(min = 7, max = 7) List<@Valid DiaDto> dias) {
    }

    public record FeriadoForm(@NotBlank @Size(max = 120) String titulo, @NotNull LocalDateTime inicio,
            @NotNull LocalDateTime fim, boolean recorrente) {
    }

    /** Resultado da simulação de prazo (ferramenta da tela de calendário). */
    public record SimulacaoDto(Instant inicio, long minutos, Instant prazo) {
    }
}
