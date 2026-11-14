package br.com.chfb.imoveis.listing.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.entity.Favorito;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.repository.FavoritoRepository;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

@Service
public class FavoritoService {

    private final FavoritoRepository favoritos;
    private final ImovelRepository imoveis;
    private final ImovelService imovelService;

    public FavoritoService(FavoritoRepository favoritos, ImovelRepository imoveis, ImovelService imovelService) {
        this.favoritos = favoritos;
        this.imoveis = imoveis;
        this.imovelService = imovelService;
    }

    @Transactional(readOnly = true)
    public List<ImovelResumo> listar(AuthUser usuario) {
        return favoritos.findByUsuarioIdOrderByCriadoEmDesc(usuario.id()).stream()
                .map(f -> imovelService.resumo(f.getImovel())).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> ids(AuthUser usuario) {
        return favoritos.idsFavoritos(usuario.id());
    }

    @Transactional
    public void adicionar(Long imovelId, AuthUser usuario) {
        if (favoritos.findByUsuarioIdAndImovelId(usuario.id(), imovelId).isPresent()) {
            return;
        }
        Imovel imovel = imoveis.findById(imovelId).orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        Favorito f = new Favorito();
        f.setUsuarioId(usuario.id());
        f.setImovel(imovel);
        favoritos.save(f);
    }

    @Transactional
    public void remover(Long imovelId, AuthUser usuario) {
        favoritos.findByUsuarioIdAndImovelId(usuario.id(), imovelId).ifPresent(favoritos::delete);
    }
}
