package br.com.chfb.imoveis.sharedkernel.port;

/**
 * Porta de eventos em tempo real (WebSocket, protocolo Pusher, servidor Soketi), implementada no módulo platform.
 * <p>
 * Tipos de canal:
 * <ul>
 *     <li><b>público</b> (sem prefixo): qualquer um assina, sem login;</li>
 *     <li><b>privado</b> ({@code private-}): só quem o backend autoriza (ex.: avisos de um usuário);</li>
 *     <li><b>protegido</b> ({@code presence-}): autorizado e com lista de quem está na sala (ex.: a conversa de uma
 *     denúncia, onde anunciante e moderação veem quem está online).</li>
 * </ul>
 * O envio acontece depois do commit da transação atual: quem recebe o evento nunca vê dado que acabou desfeito.
 */
public interface TempoReal {

    void publicar(String canal, String evento, Object dados);

    /** Canal privado de um usuário (notificações e contadores dele). */
    static String canalDoUsuario(Long usuarioId) {
        return "private-usuario." + usuarioId;
    }
}
