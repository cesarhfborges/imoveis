package br.com.chfb.imoveis.platform.calendario;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.CalendarioDto;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.ExpedienteForm;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.FeriadoDto;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.FeriadoForm;
import br.com.chfb.imoveis.platform.calendario.CalendarioDtos.SimulacaoDto;
import jakarta.validation.Valid;

/** Calendário geral (expediente e feriados): só administradores. */
@RestController
@RequestMapping("/app/admin/calendario")
public class CalendarioController {

    private final CalendarioService calendario;

    public CalendarioController(CalendarioService calendario) {
        this.calendario = calendario;
    }

    @GetMapping
    public CalendarioDto obter() {
        return calendario.obter();
    }

    @PutMapping("/expediente")
    public CalendarioDto salvarExpediente(@Valid @RequestBody ExpedienteForm form) {
        return calendario.salvarExpediente(form);
    }

    @PostMapping("/feriados")
    @ResponseStatus(HttpStatus.CREATED)
    public FeriadoDto criarFeriado(@Valid @RequestBody FeriadoForm form) {
        return calendario.salvarFeriado(null, form);
    }

    @PutMapping("/feriados/{id}")
    public FeriadoDto atualizarFeriado(@PathVariable Long id, @Valid @RequestBody FeriadoForm form) {
        return calendario.salvarFeriado(id, form);
    }

    @DeleteMapping("/feriados/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirFeriado(@PathVariable Long id) {
        calendario.excluirFeriado(id);
    }

    /** Quando vence um prazo de N minutos úteis começando em "inicio" (padrão: agora). */
    @GetMapping("/simular")
    public SimulacaoDto simular(@RequestParam(required = false) Instant inicio, @RequestParam long minutos) {
        Instant de = inicio == null ? Instant.now() : inicio;
        return new SimulacaoDto(de, minutos, calendario.somarMinutosUteis(de, Math.max(0, minutos)));
    }
}
