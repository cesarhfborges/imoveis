package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.VisitaDtos.DiaHorarios;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.PropostaForm;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.RecadoForm;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.VisitaDto;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.VisitaForm;
import br.com.chfb.imoveis.listing.service.VisitaService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/**
 * Agendamento de visitas: horários livres (público), visitas do cliente (/app/conta, qualquer usuário logado) e
 * visitas aos anúncios do anunciante (/app/corretor).
 */
@RestController
public class VisitaController {

    private final VisitaService visitas;

    public VisitaController(VisitaService visitas) {
        this.visitas = visitas;
    }

    @GetMapping("/app/public/imoveis/{id}/visitas/horarios")
    public List<DiaHorarios> horarios(@PathVariable Long id) {
        return visitas.horarios(id);
    }

    // ---- cliente

    @GetMapping("/app/conta/visitas")
    public List<VisitaDto> minhas(@AuthenticationPrincipal AuthUser u) {
        return visitas.doCliente(u);
    }

    @PostMapping("/app/conta/visitas")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitaDto pedir(@Valid @RequestBody VisitaForm form, @AuthenticationPrincipal AuthUser u) {
        return visitas.pedir(form, u);
    }

    @PostMapping("/app/conta/visitas/{id}/aceitar")
    public VisitaDto aceitar(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        return visitas.aceitarProposta(id, u);
    }

    @PostMapping("/app/conta/visitas/{id}/cancelar")
    public VisitaDto cancelar(@PathVariable Long id, @Valid @RequestBody(required = false) RecadoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return visitas.cancelarPeloCliente(id, form, u);
    }

    // ---- anunciante

    @GetMapping("/app/corretor/visitas")
    public List<VisitaDto> doAnunciante(@AuthenticationPrincipal AuthUser u) {
        return visitas.doAnunciante(u);
    }

    @PostMapping("/app/corretor/visitas/{id}/confirmar")
    public VisitaDto confirmar(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        return visitas.confirmar(id, u);
    }

    @PostMapping("/app/corretor/visitas/{id}/recusar")
    public VisitaDto recusar(@PathVariable Long id, @Valid @RequestBody(required = false) RecadoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return visitas.recusar(id, form, u);
    }

    @PostMapping("/app/corretor/visitas/{id}/propor")
    public VisitaDto propor(@PathVariable Long id, @Valid @RequestBody PropostaForm form, @AuthenticationPrincipal AuthUser u) {
        return visitas.propor(id, form, u);
    }

    @PostMapping("/app/corretor/visitas/{id}/cancelar")
    public VisitaDto cancelarPeloAnunciante(@PathVariable Long id, @Valid @RequestBody(required = false) RecadoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return visitas.cancelarPeloAnunciante(id, form, u);
    }
}
