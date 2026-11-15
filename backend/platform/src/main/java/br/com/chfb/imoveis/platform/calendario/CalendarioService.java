package br.com.chfb.imoveis.platform.calendario;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.CalendarioDto;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.DiaDto;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.ExpedienteForm;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.FeriadoDto;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.FeriadoForm;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;

/**
 * Calendário geral do sistema: expediente semanal, feriados e as contas de tempo útil usadas pelos prazos (SLA).
 * O retrato do calendário fica em memória e é refeito quando algo muda.
 */
@Service
public class CalendarioService {

    private static final ZoneId FUSO_PADRAO = ZoneId.of("America/Sao_Paulo");

    private final ExpedienteRepository expediente;
    private final FeriadoRepository feriados;
    private final CalendarioConfigRepository config;

    private volatile CalendarioUteis cache;

    public CalendarioService(ExpedienteRepository expediente, FeriadoRepository feriados,
            CalendarioConfigRepository config) {
        this.expediente = expediente;
        this.feriados = feriados;
        this.config = config;
    }

    /** Retrato atual do calendário para as contas de tempo útil. */
    @Transactional(readOnly = true)
    public CalendarioUteis atual() {
        CalendarioUteis c = cache;
        if (c == null) {
            c = carregar();
            cache = c;
        }
        return c;
    }

    public Instant somarMinutosUteis(Instant inicio, long minutos) {
        return atual().somarMinutosUteis(inicio, minutos);
    }

    public long minutosUteisEntre(Instant inicio, Instant fim) {
        return atual().minutosUteisEntre(inicio, fim);
    }

    private CalendarioUteis carregar() {
        ZoneId fuso = config.findById((short) 1).map(c -> zona(c.getFuso())).orElse(FUSO_PADRAO);
        Map<DayOfWeek, CalendarioUteis.Expediente> semana = new EnumMap<>(DayOfWeek.class);
        for (ExpedienteDia d : expediente.findAll()) {
            semana.put(DayOfWeek.of(d.getDiaSemana()), new CalendarioUteis.Expediente(d.isAtivo(), d.getInicioMinuto(), d.getFimMinuto()));
        }
        List<CalendarioUteis.Feriado> lista = feriados.findAll().stream()
                .map(f -> new CalendarioUteis.Feriado(f.getInicio(), f.getFim(), f.isRecorrente())).toList();
        return new CalendarioUteis(fuso, semana, lista);
    }

    private static ZoneId zona(String id) {
        try {
            return ZoneId.of(id);
        } catch (DateTimeException e) {
            return FUSO_PADRAO;
        }
    }

    // ------------------------------------------------------------- gestão (admin)

    @Transactional(readOnly = true)
    public CalendarioDto obter() {
        String fuso = config.findById((short) 1).map(CalendarioConfig::getFuso).orElse(FUSO_PADRAO.getId());
        return new CalendarioDto(fuso, expediente.findAllByOrderByDiaSemanaAsc().stream().map(DiaDto::of).toList(),
                feriados.findAllByOrderByInicioAsc().stream().map(FeriadoDto::of).toList());
    }

    @Transactional
    public CalendarioDto salvarExpediente(ExpedienteForm form) {
        try {
            ZoneId.of(form.fuso());
        } catch (DateTimeException e) {
            throw new BusinessException("Fuso horário inválido: " + form.fuso());
        }
        Set<Short> dias = new HashSet<>();
        for (DiaDto d : form.dias()) {
            if (!dias.add(d.diaSemana())) {
                throw new BusinessException("Dia da semana repetido");
            }
            if (d.fimMinuto() <= d.inicioMinuto()) {
                throw new BusinessException("O fim do expediente deve ser depois do início");
            }
            ExpedienteDia e = expediente.findById(d.diaSemana()).orElseGet(ExpedienteDia::new);
            e.setDiaSemana(d.diaSemana());
            e.setAtivo(d.ativo());
            e.setInicioMinuto((short) d.inicioMinuto());
            e.setFimMinuto((short) d.fimMinuto());
            expediente.save(e);
        }
        CalendarioConfig c = config.findById((short) 1).orElseGet(CalendarioConfig::new);
        c.setFuso(form.fuso());
        config.save(c);
        cache = null;
        return obter();
    }

    @Transactional
    public FeriadoDto salvarFeriado(Long id, FeriadoForm form) {
        if (!form.fim().isAfter(form.inicio())) {
            throw new BusinessException("O fim do feriado deve ser depois do início");
        }
        Feriado f = id == null ? new Feriado()
                : feriados.findById(id).orElseThrow(() -> new NotFoundException("Feriado não encontrado"));
        f.setTitulo(form.titulo().trim());
        f.setInicio(form.inicio());
        f.setFim(form.fim());
        f.setRecorrente(form.recorrente());
        FeriadoDto dto = FeriadoDto.of(feriados.save(f));
        cache = null;
        return dto;
    }

    @Transactional
    public void excluirFeriado(Long id) {
        feriados.deleteById(id);
        cache = null;
    }
}
