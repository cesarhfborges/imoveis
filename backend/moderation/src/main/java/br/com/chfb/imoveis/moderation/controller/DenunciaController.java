package br.com.chfb.imoveis.moderation.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DenunciaForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.MinhaDenunciaDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoPublicoDto;
import br.com.chfb.imoveis.moderation.service.DenunciaService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/** Denúncias feitas pelo usuário logado (qualquer perfil). */
@RestController
@RequestMapping("/app/denuncias")
public class DenunciaController {

    private final DenunciaService service;

    public DenunciaController(DenunciaService service) {
        this.service = service;
    }

    @GetMapping("/tipos")
    public List<TipoPublicoDto> tipos() {
        return service.tiposAtivos();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MinhaDenunciaDto denunciar(@Valid @RequestBody DenunciaForm form, @AuthenticationPrincipal AuthUser u) {
        return service.denunciar(form, u);
    }

    @GetMapping("/minhas")
    public List<MinhaDenunciaDto> minhas(@AuthenticationPrincipal AuthUser u) {
        return service.minhas(u);
    }
}
