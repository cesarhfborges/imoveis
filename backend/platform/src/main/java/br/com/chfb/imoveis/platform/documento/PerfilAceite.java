package br.com.chfb.imoveis.platform.documento;

import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/** Para quem o aceite do documento é exigido. */
public enum PerfilAceite {
    TODOS,
    CLIENTE,
    CORRETOR;

    /** Administradores não precisam aceitar; corretor também vale para quem entra como corretor. */
    public boolean vale(Perfil perfil) {
        if (perfil == null || perfil == Perfil.ADMIN) {
            return false;
        }
        return this == TODOS || name().equals(perfil.name());
    }
}
