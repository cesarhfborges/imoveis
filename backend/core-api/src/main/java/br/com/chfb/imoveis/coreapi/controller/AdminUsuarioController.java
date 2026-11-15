package br.com.chfb.imoveis.coreapi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

import br.com.chfb.imoveis.coreapi.dto.ContaDtos.UsuarioAdminForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.UsuarioDto;
import br.com.chfb.imoveis.coreapi.dto.DashboardDto;
import br.com.chfb.imoveis.coreapi.service.UsuarioService;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.validation.Valid;

/** Gestão de usuários e painel geral (somente ADMIN, pela área /admin). */
@RestController
@RequestMapping("/app/admin")
public class AdminUsuarioController {

    private final UsuarioService usuarios;
    private final ImovelService imoveis;

    public AdminUsuarioController(UsuarioService usuarios, ImovelService imoveis) {
        this.usuarios = usuarios;
        this.imoveis = imoveis;
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@AuthenticationPrincipal AuthUser u) {
        return new DashboardDto(usuarios.contar(), usuarios.contarPorPapel(Perfil.CLIENTE),
                usuarios.contarPorPapel(Perfil.CORRETOR), usuarios.contarPorPapel(Perfil.ADMIN),
                imoveis.estatisticas(null, u.id()));
    }

    @GetMapping("/usuarios")
    public PageResponse<UsuarioDto> listar(@RequestParam(required = false) String q,
            @RequestParam(required = false) Perfil papel, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return usuarios.buscar(q, papel, page, size);
    }

    @GetMapping("/usuarios/{id}")
    public UsuarioDto obter(@PathVariable Long id) {
        return UsuarioDto.of(usuarios.obter(id));
    }

    @PostMapping("/usuarios")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDto criar(@Valid @RequestBody UsuarioAdminForm form) {
        return usuarios.criarPeloAdmin(form);
    }

    @PutMapping("/usuarios/{id}")
    public UsuarioDto atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioAdminForm form,
            @AuthenticationPrincipal AuthUser admin) {
        return usuarios.atualizarPeloAdmin(id, form, admin);
    }

    /** Desativa a conta (os anúncios e o histórico são mantidos). */
    @DeleteMapping("/usuarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desativar(@PathVariable Long id, @AuthenticationPrincipal AuthUser admin) {
        usuarios.excluir(id, admin);
    }
}
