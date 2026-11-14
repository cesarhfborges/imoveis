package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.ContatoDto;
import br.com.chfb.imoveis.listing.dto.ContatoForm;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.dto.ImovelFiltro;
import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.dto.OpcoesBusca;
import br.com.chfb.imoveis.listing.service.ContatoService;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/**
 * Consulta pública de anúncios.
 * <ul>
 *     <li>{@code /app/public/imoveis}: usado pelo site (sem login);</li>
 *     <li>{@code /api/v1/imoveis}: API aberta, exige token Bearer.</li>
 * </ul>
 */
@RestController
@RequestMapping({"/app/public/imoveis", "/api/v1/imoveis"})
public class ImovelPublicoController {

    private final ImovelService imoveis;
    private final ContatoService contatos;

    public ImovelPublicoController(ImovelService imoveis, ContatoService contatos) {
        this.imoveis = imoveis;
        this.contatos = contatos;
    }

    @GetMapping
    public PageResponse<ImovelResumo> buscar(@ModelAttribute ImovelFiltro filtro) {
        return imoveis.buscarPublico(filtro);
    }

    @GetMapping("/destaques")
    public List<ImovelResumo> destaques(@RequestParam(defaultValue = "8") int limite) {
        return imoveis.destaques(limite);
    }

    @GetMapping("/opcoes")
    public OpcoesBusca opcoes() {
        return imoveis.opcoes();
    }

    @GetMapping("/contagem-tipos")
    public List<ImovelService.ContagemTipo> contagemTipos(@ModelAttribute ImovelFiltro filtro) {
        return imoveis.contagemPorTipo(filtro);
    }

    @GetMapping("/mapa")
    public List<ImovelResumo> mapa(@ModelAttribute ImovelFiltro filtro) {
        return imoveis.paraMapa(filtro);
    }

    @GetMapping("/{id}/similares")
    public List<ImovelResumo> similares(@PathVariable Long id) {
        return imoveis.similares(id, 4);
    }

    @GetMapping("/{id}")
    public ImovelDetalhe detalhe(@PathVariable Long id) {
        return imoveis.detalhePublico(id);
    }

    @PostMapping("/{id}/contato")
    @ResponseStatus(HttpStatus.CREATED)
    public ContatoDto contato(@PathVariable Long id, @Valid @RequestBody ContatoForm form,
            @AuthenticationPrincipal AuthUser usuario) {
        return contatos.enviar(id, form, usuario);
    }
}
