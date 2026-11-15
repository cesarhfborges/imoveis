package br.com.chfb.imoveis.sharedkernel.port;

import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Regra de acesso a canais privados/protegidos do tempo real. Cada módulo registra (como bean) a regra dos
 * canais que ele cria; um canal que nenhuma regra reconhece é negado.
 */
public interface AutorizadorDeCanal {

    /**
     * @return {@code null} se esta regra não trata o canal; senão, se o usuário pode entrar nele
     */
    Boolean pode(String canal, AuthUser usuario);
}
