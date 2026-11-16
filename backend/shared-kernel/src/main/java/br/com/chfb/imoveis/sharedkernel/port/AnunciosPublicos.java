package br.com.chfb.imoveis.sharedkernel.port;

import java.util.Collection;
import java.util.Map;

/** Porta para o módulo de contas contar os anúncios no ar de cada anunciante (implementada no módulo de anúncios). */
public interface AnunciosPublicos {

    /** Anúncios ATIVOS por anunciante; quem não tem nenhum fica fora do mapa. */
    Map<Long, Long> contarAtivos(Collection<Long> anuncianteIds);
}
