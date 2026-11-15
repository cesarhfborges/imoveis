package br.com.chfb.imoveis.platform.calendario;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Retrato imutável do calendário (fuso, expediente semanal e feriados) com as contas de tempo útil.
 * <p>
 * Tempo útil = dentro do expediente do dia e fora de qualquer feriado. Os feriados são intervalos de
 * data/hora locais (ex.: véspera de Natal das 13:00 às 23:59) e podem se repetir todo ano.
 * <p>
 * Classe pura (sem Spring nem banco) para poder ser testada isoladamente.
 */
public final class CalendarioUteis {

    /** Até onde procurar tempo útil (evita laço infinito se nenhum dia tiver expediente). */
    private static final int LIMITE_DIAS = 3 * 366;

    /** Expediente do dia em minutos desde 00:00 (fim pode ser 1440 = 24:00). */
    public record Expediente(boolean ativo, int inicioMinuto, int fimMinuto) {
    }

    public record Feriado(LocalDateTime inicio, LocalDateTime fim, boolean recorrente) {
    }

    /** Intervalo local [inicio, fim). */
    private record Faixa(LocalDateTime inicio, LocalDateTime fim) {
    }

    private final ZoneId fuso;
    private final Map<DayOfWeek, Expediente> semana;
    private final List<Feriado> feriados;

    public CalendarioUteis(ZoneId fuso, Map<DayOfWeek, Expediente> semana, List<Feriado> feriados) {
        this.fuso = fuso;
        this.semana = semana.isEmpty() ? new EnumMap<>(DayOfWeek.class) : new EnumMap<>(semana);
        this.feriados = List.copyOf(feriados);
    }

    public ZoneId fuso() {
        return fuso;
    }

    /** Há ao menos um dia com expediente? Sem isso nenhum prazo útil chega ao fim. */
    public boolean temExpediente() {
        return semana.values().stream().anyMatch(Expediente::ativo);
    }

    /**
     * Momento em que se completam {@code minutos} úteis a partir de {@code inicio}.
     * Ex.: expediente até 18:00, início sexta 17:00 e 120 minutos: 60 na sexta e 60 na segunda, vence seg 09:00.
     *
     * @return o prazo, ou {@code null} se não houver expediente suficiente no horizonte (3 anos)
     */
    public Instant somarMinutosUteis(Instant inicio, long minutos) {
        if (minutos <= 0) {
            return inicio;
        }
        LocalDateTime t = LocalDateTime.ofInstant(inicio, fuso);
        long restante = minutos * 60;
        LocalDate dia = t.toLocalDate();
        for (int i = 0; i < LIMITE_DIAS; i++, dia = dia.plusDays(1)) {
            for (Faixa f : faixasUteis(dia)) {
                LocalDateTime a = f.inicio().isAfter(t) ? f.inicio() : t;
                if (!a.isBefore(f.fim())) {
                    continue;
                }
                long disponivel = Duration.between(a, f.fim()).getSeconds();
                if (disponivel >= restante) {
                    return a.plusSeconds(restante).atZone(fuso).toInstant();
                }
                restante -= disponivel;
            }
        }
        return null;
    }

    /** Segundos úteis entre dois momentos (0 se {@code fim} não for depois de {@code inicio}). */
    public long segundosUteisEntre(Instant inicio, Instant fim) {
        if (fim == null || !fim.isAfter(inicio)) {
            return 0;
        }
        LocalDateTime a = LocalDateTime.ofInstant(inicio, fuso);
        LocalDateTime b = LocalDateTime.ofInstant(fim, fuso);
        long total = 0;
        for (LocalDate dia = a.toLocalDate(); !dia.isAfter(b.toLocalDate()); dia = dia.plusDays(1)) {
            for (Faixa f : faixasUteis(dia)) {
                LocalDateTime x = f.inicio().isAfter(a) ? f.inicio() : a;
                LocalDateTime y = f.fim().isBefore(b) ? f.fim() : b;
                if (x.isBefore(y)) {
                    total += Duration.between(x, y).getSeconds();
                }
            }
        }
        return total;
    }

    /** Minutos úteis entre dois momentos, arredondados para cima (mostra "1 min" até o último segundo). */
    public long minutosUteisEntre(Instant inicio, Instant fim) {
        long s = segundosUteisEntre(inicio, fim);
        return (s + 59) / 60;
    }

    /**
     * Primeiro momento útil a partir de {@code t} (o próprio {@code t} se ele já estiver no expediente).
     *
     * @return {@code null} se não houver expediente no horizonte
     */
    public Instant proximoMomentoUtil(Instant t) {
        LocalDateTime local = LocalDateTime.ofInstant(t, fuso);
        LocalDate dia = local.toLocalDate();
        for (int i = 0; i < LIMITE_DIAS; i++, dia = dia.plusDays(1)) {
            for (Faixa f : faixasUteis(dia)) {
                if (local.isBefore(f.fim())) {
                    LocalDateTime m = f.inicio().isAfter(local) ? f.inicio() : local;
                    return m.atZone(fuso).toInstant();
                }
            }
        }
        return null;
    }

    public boolean emExpediente(Instant t) {
        return t.equals(proximoMomentoUtil(t));
    }

    // ------------------------------------------------------------------ apoio

    /** Faixas úteis de um dia, em ordem: o expediente menos os feriados que caem nele. */
    private List<Faixa> faixasUteis(LocalDate dia) {
        Expediente e = semana.get(dia.getDayOfWeek());
        if (e == null || !e.ativo() || e.fimMinuto() <= e.inicioMinuto()) {
            return List.of();
        }
        LocalDateTime zero = dia.atStartOfDay();
        List<Faixa> livres = new ArrayList<>(List.of(new Faixa(zero.plusMinutes(e.inicioMinuto()), zero.plusMinutes(e.fimMinuto()))));
        for (Feriado feriado : feriados) {
            for (Faixa fechado : ocorrencias(feriado, dia)) {
                livres = subtrair(livres, fechado);
            }
        }
        return livres;
    }

    /** Ocorrências de um feriado que tocam o dia (recorrentes: a do ano do dia e a do ano anterior, p/ viradas de ano). */
    private static List<Faixa> ocorrencias(Feriado f, LocalDate dia) {
        LocalDateTime d0 = dia.atStartOfDay();
        LocalDateTime d1 = d0.plusDays(1);
        List<Faixa> lista = new ArrayList<>(2);
        if (!f.recorrente()) {
            adicionarSeToca(lista, new Faixa(f.inicio(), f.fim()), d0, d1);
            return lista;
        }
        for (int ano = dia.getYear() - 1; ano <= dia.getYear(); ano++) {
            long anos = ano - f.inicio().getYear();
            adicionarSeToca(lista, new Faixa(f.inicio().plusYears(anos), f.fim().plusYears(anos)), d0, d1);
        }
        return lista;
    }

    private static void adicionarSeToca(List<Faixa> lista, Faixa f, LocalDateTime d0, LocalDateTime d1) {
        if (f.inicio().isBefore(d1) && f.fim().isAfter(d0)) {
            lista.add(f);
        }
    }

    private static List<Faixa> subtrair(List<Faixa> livres, Faixa fechado) {
        List<Faixa> r = new ArrayList<>(livres.size() + 1);
        for (Faixa f : livres) {
            if (!fechado.fim().isAfter(f.inicio()) || !fechado.inicio().isBefore(f.fim())) {
                r.add(f);
                continue;
            }
            if (fechado.inicio().isAfter(f.inicio())) {
                r.add(new Faixa(f.inicio(), fechado.inicio()));
            }
            if (fechado.fim().isBefore(f.fim())) {
                r.add(new Faixa(fechado.fim(), f.fim()));
            }
        }
        return r;
    }
}
