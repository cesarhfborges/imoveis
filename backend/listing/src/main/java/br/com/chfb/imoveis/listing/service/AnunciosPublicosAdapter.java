package br.com.chfb.imoveis.listing.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.port.AnunciosPublicos;

/** Contagem de anúncios no ar por anunciante, para o diretório de imobiliárias e corretores. */
@Component
public class AnunciosPublicosAdapter implements AnunciosPublicos {

    private final ImovelRepository imoveis;

    public AnunciosPublicosAdapter(ImovelRepository imoveis) {
        this.imoveis = imoveis;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, Long> contarAtivos(Collection<Long> anuncianteIds) {
        Map<Long, Long> total = new HashMap<>();
        if (anuncianteIds == null || anuncianteIds.isEmpty()) {
            return total;
        }
        for (Object[] linha : imoveis.contarPorAnunciante(anuncianteIds, StatusAnuncio.ATIVO)) {
            total.put((Long) linha[0], (Long) linha[1]);
        }
        return total;
    }
}
