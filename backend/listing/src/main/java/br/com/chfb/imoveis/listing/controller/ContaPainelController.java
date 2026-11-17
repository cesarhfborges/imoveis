package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.ClientePainel;
import br.com.chfb.imoveis.listing.dto.ClientePainel.QuedaPreco;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.service.ContaPainelService;
import br.com.chfb.imoveis.listing.dto.VistoRecente;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
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

    /** Histórico "Vistos recentemente" (paginado, do mais recente). */
    @GetMapping("/vistos")
    public PageResponse<VistoRecente> vistos(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size, @AuthenticationPrincipal AuthUser u) {
        return painel.vistos(u, page, size);
    }

    /** Tira um imóvel do histórico. */
    @DeleteMapping("/vistos/{imovelId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerVisto(@PathVariable Long imovelId, @AuthenticationPrincipal AuthUser u) {
        painel.removerVisto(u, imovelId);
    }

    /** Apaga todo o histórico. */
    @DeleteMapping("/vistos")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void limparVistos(@AuthenticationPrincipal AuthUser u) {
        painel.limparVistos(u);
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
