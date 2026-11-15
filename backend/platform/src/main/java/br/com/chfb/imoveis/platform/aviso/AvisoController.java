package br.com.chfb.imoveis.platform.aviso;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AceiteForm;
import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoDto;
import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoForm;
import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoPublicoDto;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/**
 * Avisos do site: leitura pública (visitantes também), aceite do usuário logado e cadastro pela administração.
 */
@RestController
public class AvisoController {

    private final AvisoService service;

    public AvisoController(AvisoService service) {
        this.service = service;
    }

    /** Avisos vigentes da área (SITE, CONTA ou ADMIN); logado, vem a versão que ele já aceitou. */
    @GetMapping("/app/public/avisos")
    public List<AvisoPublicoDto> vigentes(@RequestParam(defaultValue = "SITE") Aviso.Area area,
            @AuthenticationPrincipal AuthUser u) {
        return service.vigentes(area, u);
    }

    @PostMapping("/app/avisos/{id}/aceite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void aceitar(@PathVariable Long id, @Valid @RequestBody AceiteForm form, @AuthenticationPrincipal AuthUser u) {
        service.aceitar(id, form.versao(), u);
    }

    @GetMapping("/app/admin/avisos")
    public List<AvisoDto> listar() {
        return service.listar();
    }

    @PostMapping("/app/admin/avisos")
    @ResponseStatus(HttpStatus.CREATED)
    public AvisoDto criar(@Valid @RequestBody AvisoForm form) {
        return service.salvar(null, form);
    }

    @PutMapping("/app/admin/avisos/{id}")
    public AvisoDto atualizar(@PathVariable Long id, @Valid @RequestBody AvisoForm form) {
        return service.salvar(id, form);
    }

    @DeleteMapping("/app/admin/avisos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
