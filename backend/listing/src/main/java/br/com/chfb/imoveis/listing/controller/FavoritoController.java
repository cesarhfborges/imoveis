package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.service.FavoritoService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Favoritos do usuário logado (qualquer perfil). */
@RestController
@RequestMapping("/app/conta/favoritos")
public class FavoritoController {

    private final FavoritoService favoritos;

    public FavoritoController(FavoritoService favoritos) {
        this.favoritos = favoritos;
    }

    @GetMapping
    public List<ImovelResumo> listar(@AuthenticationPrincipal AuthUser u) {
        return favoritos.listar(u);
    }

    @GetMapping("/ids")
    public List<Long> ids(@AuthenticationPrincipal AuthUser u) {
        return favoritos.ids(u);
    }

    @PostMapping("/{imovelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void adicionar(@PathVariable Long imovelId, @AuthenticationPrincipal AuthUser u) {
        favoritos.adicionar(imovelId, u);
    }

    @DeleteMapping("/{imovelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable Long imovelId, @AuthenticationPrincipal AuthUser u) {
        favoritos.remover(imovelId, u);
    }
}
