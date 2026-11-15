package br.com.chfb.imoveis.coreapi.security;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Derruba na hora a sessão de uma conta que foi desativada ou banida (sem esperar a sessão expirar):
 * a cada requisição autenticada por sessão confere se a conta continua ativa.
 */
public class ContaAtivaFilter extends OncePerRequestFilter {

    private final UsuarioRepository usuarios;

    public ContaAtivaFilter(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser u && AuthUser.VIA_SESSION.equals(u.via())
                && !usuarios.existsByIdAndAtivoTrue(u.id())) {
            SecurityContextHolder.clearContext();
            HttpSession sessao = req.getSession(false);
            if (sessao != null) {
                sessao.invalidate();
            }
            JsonErrorWriter.write(req, res, 401, "Unauthorized", "Sua conta está desativada.");
            return;
        }
        chain.doFilter(req, res);
    }
}
