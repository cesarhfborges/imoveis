package br.com.chfb.imoveis.sharedkernel.port;

import java.util.Collection;

/**
 * Porta do módulo de notificações: qualquer parte do sistema que queira avisar um usuário cria
 * uma notificação por aqui (implementada no módulo platform).
 * <p>
 * A notificação é só um aviso com um link: apagá-la ou marcá-la como lida nunca altera o registro de origem.
 */
public interface Notificador {

    void notificar(Nova notificacao);

    default void notificarTodos(Collection<Long> usuarioIds, Nova modelo) {
        usuarioIds.stream().distinct().forEach(id -> notificar(modelo.para(id)));
    }

    /**
     * @param usuarioId  destinatário
     * @param tipo       categoria livre, em maiúsculas (ex.: CONTATO_RECEBIDO, DENUNCIA_PRAZO)
     * @param titulo     linha principal
     * @param mensagem   detalhe (opcional)
     * @param icone      classe do PrimeIcons sem o "pi " (ex.: "pi-flag"); opcional
     * @param link       rota do front aberta ao clicar (ex.: "/conta/pendencias/12"); opcional
     * @param origemTipo tipo do registro de origem (ex.: "DENUNCIA"); só referência
     * @param origemId   id do registro de origem; só referência
     */
    record Nova(Long usuarioId, String tipo, String titulo, String mensagem, String icone, String link,
            String origemTipo, Long origemId) {

        public Nova para(Long outroUsuario) {
            return new Nova(outroUsuario, tipo, titulo, mensagem, icone, link, origemTipo, origemId);
        }
    }
}
