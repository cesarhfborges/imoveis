package br.com.chfb.imoveis.coreapi.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenCriado;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenDto;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.PerfilForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.SenhaForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.UsuarioDto;
import br.com.chfb.imoveis.coreapi.service.ApiTokenService;
import br.com.chfb.imoveis.coreapi.service.UsuarioService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/** Dados da própria conta e tokens da API aberta (qualquer perfil logado). */
@RestController
@RequestMapping("/app/conta")
public class ContaController {

    private final UsuarioService usuarios;
    private final ApiTokenService tokens;

    public ContaController(UsuarioService usuarios, ApiTokenService tokens) {
        this.usuarios = usuarios;
        this.tokens = tokens;
    }

    @GetMapping("/perfil")
    public UsuarioDto perfil(@AuthenticationPrincipal AuthUser u) {
        return UsuarioDto.of(usuarios.obter(u.id()));
    }

    @PutMapping("/perfil")
    public UsuarioDto atualizar(@Valid @RequestBody PerfilForm form, @AuthenticationPrincipal AuthUser u) {
        return usuarios.atualizarPerfil(u, form);
    }

    @PutMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void senha(@Valid @RequestBody SenhaForm form, @AuthenticationPrincipal AuthUser u) {
        usuarios.trocarSenha(u, form);
    }

    @GetMapping("/tokens")
    public List<ApiTokenDto> listarTokens(@AuthenticationPrincipal AuthUser u) {
        return tokens.listar(u);
    }

    @PostMapping("/tokens")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiTokenCriado criarToken(@Valid @RequestBody ApiTokenForm form, @AuthenticationPrincipal AuthUser u) {
        return tokens.criar(form, u);
    }

    @DeleteMapping("/tokens/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revogarToken(@PathVariable Long id, @AuthenticationPrincipal AuthUser u) {
        tokens.revogar(id, u);
    }
}
