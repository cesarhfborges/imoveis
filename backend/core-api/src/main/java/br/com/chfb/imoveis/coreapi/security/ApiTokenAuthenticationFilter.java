package br.com.chfb.imoveis.coreapi.security;

import java.io.IOException;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.chfb.imoveis.coreapi.service.ApiTokenService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Autentica a API aberta (/api/v1/**) pelo cabeçalho {@code Authorization: Bearer <token>}.
 * Não usa sessão: cada requisição traz o token.
 */
public class ApiTokenAuthenticationFilter extends OncePerRequestFilter {

    private final ApiTokenService tokens;

    public ApiTokenAuthenticationFilter(ApiTokenService tokens) {
        this.tokens = tokens;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String valor = header.substring(7).trim();
            Optional<AuthUser> usuario = tokens.autenticar(valor);
            if (usuario.isEmpty()) {
                res.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer error=\"invalid_token\"");
                JsonErrorWriter.write(req, res, 401, "Unauthorized", "Token inválido, expirado ou revogado.");
                return;
            }
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(SessionAuthenticator.autenticacao(usuario.get()));
            SecurityContextHolder.setContext(ctx);
        }
        try {
            chain.doFilter(req, res);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
