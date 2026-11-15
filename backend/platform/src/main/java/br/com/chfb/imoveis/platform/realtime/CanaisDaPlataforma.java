package br.com.chfb.imoveis.platform.realtime;

import org.springframework.stereotype.Component;

import br.com.chfb.imoveis.sharedkernel.port.AutorizadorDeCanal;
import br.com.chfb.imoveis.sharedkernel.port.TempoReal;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Canais gerais:
 * <ul>
 *     <li>{@code private-usuario.{id}}: só o próprio usuário (notificações, contadores);</li>
 *     <li>{@code private-admin.*}: só quem está logado como administrador.</li>
 * </ul>
 */
@Component
public class CanaisDaPlataforma implements AutorizadorDeCanal {

    @Override
    public Boolean pode(String canal, AuthUser u) {
        if (canal.startsWith("private-usuario.")) {
            return canal.equals(TempoReal.canalDoUsuario(u.id()));
        }
        if (canal.startsWith("private-admin.") || canal.startsWith("presence-admin.")) {
            return u.isAdmin();
        }
        return null;
    }
}
