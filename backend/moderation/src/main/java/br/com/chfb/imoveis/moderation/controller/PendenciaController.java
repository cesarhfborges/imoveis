package br.com.chfb.imoveis.moderation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ContadorDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GrupoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.PendenciasImovelDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.RespostaForm;
import br.com.chfb.imoveis.moderation.service.DenunciaService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/** Pendências (denúncias) dos anúncios do usuário logado: só os anúncios dele. */
@RestController
@RequestMapping("/app/anunciante/pendencias")
public class PendenciaController {

    private final DenunciaService service;

    public PendenciaController(DenunciaService service) {
        this.service = service;
    }

    @GetMapping
    public List<GrupoDto> listar(@RequestParam(defaultValue = "true") boolean abertas, @AuthenticationPrincipal AuthUser u) {
        return service.pendenciasDoAnunciante(u, abertas);
    }

    @GetMapping("/contador")
    public ContadorDto contador(@AuthenticationPrincipal AuthUser u) {
        return service.contadorDoAnunciante(u);
    }

    @GetMapping("/{imovelId}")
    public PendenciasImovelDto doImovel(@PathVariable Long imovelId, @AuthenticationPrincipal AuthUser u) {
        return service.pendenciasDoImovel(imovelId, u);
    }

    @PostMapping("/responder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void responder(@Valid @RequestBody RespostaForm form, @AuthenticationPrincipal AuthUser u) {
        service.responder(form, u);
    }
}
