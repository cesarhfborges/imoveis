package br.com.chfb.imoveis.listing.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.ContatoDto;
import br.com.chfb.imoveis.listing.dto.EstatisticasAnuncios;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.dto.ImovelFiltro;
import br.com.chfb.imoveis.listing.dto.ImovelForm;
import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.dto.StatusForm;
import br.com.chfb.imoveis.listing.service.ContatoService;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/**
 * Gestão de anúncios. As mesmas rotas atendem:
 * <ul>
 *     <li>{@code /app/corretor} e {@code /api/v1/corretor}: perfil CORRETOR, somente os próprios anúncios;</li>
 *     <li>{@code /app/admin} e {@code /api/v1/admin}: perfil ADMIN, anúncios de todos.</li>
 * </ul>
 * Quem pode chamar cada prefixo é definido na configuração de segurança; o serviço
 * aplica a regra "dono ou administrador" em cada operação.
 */
@RestController
@RequestMapping({"/app/corretor", "/app/admin", "/api/v1/corretor", "/api/v1/admin"})
public class AnuncioGestaoController {

    private final ImovelService imoveis;
    private final ContatoService contatos;

    public AnuncioGestaoController(ImovelService imoveis, ContatoService contatos) {
        this.imoveis = imoveis;
        this.contatos = contatos;
    }

    @GetMapping("/imoveis")
    public PageResponse<ImovelResumo> listar(@ModelAttribute ImovelFiltro filtro, @AuthenticationPrincipal AuthUser u) {
        return u.isAdmin() ? imoveis.buscarAdmin(filtro) : imoveis.buscarDoAnunciante(u.id(), filtro);
    }

    @GetMapping("/imoveis/{id}")
    public ImovelDetalhe detalhe(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        return imoveis.detalheParaEdicao(id, u);
    }

    @PostMapping("/imoveis")
    @ResponseStatus(HttpStatus.CREATED)
    public ImovelDetalhe criar(@Valid @RequestBody ImovelForm form, @AuthenticationPrincipal AuthUser u) {
        return imoveis.criar(form, u);
    }

    @PutMapping("/imoveis/{id}")
    public ImovelDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody ImovelForm form,
            @AuthenticationPrincipal AuthUser u) {
        return imoveis.atualizar(id, form, u);
    }

    @PatchMapping("/imoveis/{id}/status")
    public ImovelDetalhe status(@PathVariable Long id, @Valid @RequestBody StatusForm form,
            @AuthenticationPrincipal AuthUser u) {
        return imoveis.alterarStatus(id, form, u);
    }

    @DeleteMapping("/imoveis/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        imoveis.excluir(id, u);
    }

    @GetMapping("/anuncios/estatisticas")
    public EstatisticasAnuncios estatisticas(@AuthenticationPrincipal AuthUser u) {
        return imoveis.estatisticas(u.isAdmin() ? null : u.id(), u.id());
    }

    @GetMapping("/contatos")
    public PageResponse<ContatoDto> contatos(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @AuthenticationPrincipal AuthUser u) {
        return contatos.listar(u, page, size);
    }

    @PatchMapping("/contatos/{id}")
    public ContatoDto marcarLido(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean lido,
            @AuthenticationPrincipal AuthUser u) {
        return contatos.marcarLido(id, lido, u);
    }
}
