package br.com.chfb.imoveis.sharedkernel.security;

import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;

/**
 * Perfis de acesso. Funcionam em hierarquia para o login:
 * <ul>
 *     <li>ADMIN pode entrar como ADMIN, CORRETOR ou CLIENTE;</li>
 *     <li>CORRETOR pode entrar como CORRETOR ou CLIENTE;</li>
 *     <li>CLIENTE entra apenas como CLIENTE.</li>
 * </ul>
 * A sessão (ou o token) carrega somente o perfil escolhido no login.
 */
public enum Perfil {
    CLIENTE,
    CORRETOR,
    ADMIN;

    public String authority() {
        return "ROLE_" + name();
    }

    /** Perfis com os quais um usuário que possui os papéis informados pode entrar. */
    public static Set<Perfil> permitidosPara(Collection<Perfil> papeis) {
        EnumSet<Perfil> permitidos = EnumSet.noneOf(Perfil.class);
        if (papeis == null) {
            return permitidos;
        }
        if (papeis.contains(ADMIN)) {
            permitidos.addAll(EnumSet.allOf(Perfil.class));
        }
        if (papeis.contains(CORRETOR)) {
            permitidos.add(CORRETOR);
            permitidos.add(CLIENTE);
        }
        if (papeis.contains(CLIENTE)) {
            permitidos.add(CLIENTE);
        }
        return permitidos;
    }
}
