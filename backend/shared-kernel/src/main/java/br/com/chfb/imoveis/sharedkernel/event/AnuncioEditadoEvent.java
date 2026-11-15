package br.com.chfb.imoveis.sharedkernel.event;

import java.util.List;

/**
 * Publicado (de forma síncrona, dentro da transação) depois que um anúncio foi editado e algo mudou.
 * A moderação registra as alterações nas denúncias abertas do anúncio, para conferir a correção.
 *
 * @param porAdmin   editado por um administrador (senão, pelo anunciante)
 * @param alteracoes o que mudou, campo a campo, já formatado para leitura
 */
public record AnuncioEditadoEvent(Long imovelId, Long editorId, boolean porAdmin, List<Alteracao> alteracoes) {

    /** Um campo alterado: valores antes e depois (nulos = não informado). */
    public record Alteracao(String campo, String antes, String depois) {
    }
}
