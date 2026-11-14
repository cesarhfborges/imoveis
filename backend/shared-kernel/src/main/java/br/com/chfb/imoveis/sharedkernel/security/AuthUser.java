package br.com.chfb.imoveis.sharedkernel.security;

import java.io.Serializable;
import java.security.Principal;

/**
 * Usuário autenticado (sessão ou token). Fica guardado na sessão HTTP,
 * por isso é serializável e não carrega dados sensíveis.
 *
 * @param id     id do usuário
 * @param nome   nome para exibição
 * @param email  e-mail de login
 * @param perfil perfil escolhido no login (ou o perfil do token de API)
 * @param via    "SESSION" ou "TOKEN"
 */
public record AuthUser(Long id, String nome, String email, Perfil perfil, String via) implements Principal, Serializable {

    public static final String VIA_SESSION = "SESSION";
    public static final String VIA_TOKEN = "TOKEN";

    @Override
    public String getName() {
        return email;
    }

    public boolean isAdmin() {
        return perfil == Perfil.ADMIN;
    }
}
