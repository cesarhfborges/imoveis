package br.com.chfb.imoveis.platform.notificacao;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Notificações do usuário logado (qualquer perfil). */
@RestController
@RequestMapping("/app/notificacoes")
public class NotificacaoController {

    private final NotificacaoService service;

    public NotificacaoController(NotificacaoService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<NotificacaoDto> listar(@RequestParam(defaultValue = "false") boolean naoLidas,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "15") int size,
            @AuthenticationPrincipal AuthUser u) {
        return service.listar(u.id(), naoLidas, page, size);
    }

    @GetMapping("/contador")
    public Map<String, Long> contador(@AuthenticationPrincipal AuthUser u) {
        return Map.of("naoLidas", service.naoLidas(u.id()));
    }

    @PostMapping("/{id}/abrir")
    public NotificacaoDto abrir(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        return service.abrir(id, u.id());
    }

    @PatchMapping("/{id}")
    public NotificacaoDto marcar(@PathVariable Long id, @RequestParam boolean lida, @AuthenticationPrincipal AuthUser u) {
        return service.marcar(id, u.id(), lida);
    }

    @PostMapping("/lidas")
    public Map<String, Integer> marcarTodasLidas(@AuthenticationPrincipal AuthUser u) {
        return Map.of("atualizadas", service.marcarTodasLidas(u.id()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void apagar(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        service.apagar(id, u.id());
    }

    @DeleteMapping("/lidas")
    public Map<String, Integer> apagarLidas(@AuthenticationPrincipal AuthUser u) {
        return Map.of("apagadas", service.apagarLidas(u.id()));
    }
}
