package br.com.chfb.imoveis.coreapi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.coreapi.dto.AuthDtos.CsrfResponse;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.LoginRequest;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.RegistroRequest;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.Sessao;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.TrocarPerfilRequest;
import br.com.chfb.imoveis.coreapi.security.SessionAuthenticator;
import br.com.chfb.imoveis.coreapi.service.AuthService;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

/**
 * Login por cookie de sessão, usado só pelo front.
 * O logout é tratado pelo Spring Security em POST /app/auth/logout.
 */
@RestController
@RequestMapping("/app/auth")
public class AuthController {

    private final AuthService auth;
    private final SessionAuthenticator sessao;

    public AuthController(AuthService auth, SessionAuthenticator sessao) {
        this.auth = auth;
        this.sessao = sessao;
    }

    /** Garante o cookie XSRF-TOKEN antes do primeiro POST. */
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @GetMapping("/me")
    public Sessao me(@AuthenticationPrincipal AuthUser usuario) {
        return auth.sessao(usuario);
    }

    @PostMapping("/login")
    public Sessao login(@Valid @RequestBody LoginRequest req, HttpServletRequest http, HttpServletResponse res) {
        AuthUser usuario = auth.login(req);
        sessao.entrar(usuario, http, res);
        return auth.sessao(usuario);
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public Sessao registro(@Valid @RequestBody RegistroRequest req, HttpServletRequest http, HttpServletResponse res) {
        AuthUser usuario = auth.registrar(req, http.getRemoteAddr());
        sessao.entrar(usuario, http, res);
        return auth.sessao(usuario);
    }

    @PostMapping("/perfil")
    public Sessao trocarPerfil(@Valid @RequestBody TrocarPerfilRequest req, @AuthenticationPrincipal AuthUser atual,
            HttpServletRequest http, HttpServletResponse res) {
        if (atual == null) {
            throw new BusinessException(401, "Faça login para continuar.");
        }
        AuthUser novo = auth.trocarPerfil(atual, req.perfil());
        sessao.entrar(novo, http, res);
        return auth.sessao(novo);
    }
}
