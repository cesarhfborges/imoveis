package br.com.chfb.imoveis.coreapi.controller;

import java.time.LocalDate;

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
import br.com.chfb.imoveis.coreapi.service.ExclusaoContaService;
import br.com.chfb.imoveis.coreapi.service.UsuarioService;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.listing.service.PainelService;
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
    private final ExclusaoContaService exclusao;

    public AdminUsuarioController(UsuarioService usuarios, ImovelService imoveis, ExclusaoContaService exclusao) {
        this.usuarios = usuarios;
        this.imoveis = imoveis;
        this.exclusao = exclusao;
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@RequestParam(defaultValue = "30") int dias, @AuthenticationPrincipal AuthUser u) {
        int periodo = PainelService.PERIODOS.contains(dias) ? dias : 30;
        return new DashboardDto(usuarios.contar(), usuarios.contarPorPapel(Perfil.CLIENTE),
                usuarios.contarPorPapel(Perfil.CORRETOR), usuarios.contarPorPapel(Perfil.ADMIN),
                imoveis.estatisticas(null, u.id()),
                usuarios.cadastrosPorDia(LocalDate.now(PainelService.FUSO).minusDays(periodo - 1L)));
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

    /** Exclusão definitiva (LGPD): apaga a conta e os dados dela. Não pode ser desfeita. */
    @DeleteMapping("/usuarios/{id}/definitivo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirDefinitivamente(@PathVariable Long id, @AuthenticationPrincipal AuthUser admin) {
        exclusao.excluirDefinitivamente(id, admin);
    }
}
