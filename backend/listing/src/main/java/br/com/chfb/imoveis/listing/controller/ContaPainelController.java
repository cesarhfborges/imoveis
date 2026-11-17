package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.ClientePainel;
import br.com.chfb.imoveis.listing.dto.ClientePainel.QuedaPreco;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.service.ContaPainelService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Painel da conta do usuário logado (sempre os dados do próprio usuário). */
@RestController
@RequestMapping("/app/conta")
public class ContaPainelController {

    private final ContaPainelService painel;

    public ContaPainelController(ContaPainelService painel) {
        this.painel = painel;
    }

    @GetMapping("/painel")
    public ClientePainel painel(@AuthenticationPrincipal AuthUser u) {
        return painel.painel(u);
    }

    /** Detalhes dos favoritos escolhidos para a página "Comparar favoritos" (até 4, só os do próprio usuário). */
    @GetMapping("/favoritos/comparar")
    public List<ImovelDetalhe> comparar(@RequestParam(defaultValue = "") List<Long> ids, @AuthenticationPrincipal AuthUser u) {
        return painel.comparar(u, ids);
    }

    /** Favoritos que baixaram de preço desde que foram salvos (selo na página de favoritos). */
    @GetMapping("/favoritos/quedas")
    public List<QuedaPreco> quedas(@AuthenticationPrincipal AuthUser u) {
        return painel.quedas(u);
    }
}
