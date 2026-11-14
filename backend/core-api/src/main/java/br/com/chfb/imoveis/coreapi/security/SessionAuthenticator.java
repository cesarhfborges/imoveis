package br.com.chfb.imoveis.coreapi.security;

import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Cria/atualiza a autenticação guardada na sessão HTTP (cookie de sessão). */
@Component
public class SessionAuthenticator {

    private final SecurityContextRepository repository;

    public SessionAuthenticator(SecurityContextRepository repository) {
        this.repository = repository;
    }

    /** Autenticação com uma única autoridade: o perfil escolhido no login (ROLE_CLIENTE, ROLE_CORRETOR ou ROLE_ADMIN). */
    public static Authentication autenticacao(AuthUser usuario) {
        return UsernamePasswordAuthenticationToken.authenticated(usuario, null,
                List.of(new SimpleGrantedAuthority(usuario.perfil().authority())));
    }

    public void entrar(AuthUser usuario, HttpServletRequest req, HttpServletResponse res) {
        // Novo id de sessão a cada login (proteção contra fixação de sessão)
        if (req.getSession(false) != null) {
            req.changeSessionId();
        } else {
            req.getSession(true);
        }
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(autenticacao(usuario));
        SecurityContextHolder.setContext(ctx);
        repository.saveContext(ctx, req, res);
    }
}
