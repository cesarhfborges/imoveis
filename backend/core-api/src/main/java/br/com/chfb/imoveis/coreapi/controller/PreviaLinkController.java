package br.com.chfb.imoveis.coreapi.controller;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import br.com.chfb.imoveis.coreapi.service.ConfiguracaoService;
import br.com.chfb.imoveis.coreapi.service.PreviaLinkHtml;
import br.com.chfb.imoveis.listing.service.ImovelService;

/**
 * Prévia de link dos anúncios (WhatsApp, Facebook, Telegram, X…): HTML só com as tags Open Graph, com a foto de capa.
 * Em produção o nginx encaminha para cá apenas os robôs de prévia que pedem /imovel/{id}/...; visitantes recebem o
 * site normal. É público (GET sem Origin passa pela trava do /app/**) e leve: uma consulta, sem contar visita.
 */
@RestController
public class PreviaLinkController {

    // private: a resposta do /app/** leva o cookie XSRF-TOKEN, que não pode ficar em cache compartilhado
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate();

    private final ImovelService imoveis;
    private final ConfiguracaoService config;

    public PreviaLinkController(ImovelService imoveis, ConfiguracaoService config) {
        this.imoveis = imoveis;
        this.config = config;
    }

    @GetMapping(value = "/app/public/previa/imovel/{id}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> imovel(@PathVariable Long id) {
        // origem pública vista pelo visitante (X-Forwarded-* do nginx, server.forward-headers-strategy=framework)
        String base = ServletUriComponentsBuilder.fromCurrentContextPath().replacePath(null).build().toUriString();
        Configuracao c = config.atual();
        String imagemSite = c.getSeoImagemUrl() != null ? c.getSeoImagemUrl() : c.getLogoUrl();
        return imoveis.detalheParaPrevia(id)
                .map(i -> ResponseEntity.ok().cacheControl(CACHE).body(PreviaLinkHtml.doImovel(i, base, c.getNomeApp(), imagemSite)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CACHE)
                        .body(PreviaLinkHtml.doSite(base, c.getNomeApp(), c.getSeoDescricao(), imagemSite)));
    }
}
