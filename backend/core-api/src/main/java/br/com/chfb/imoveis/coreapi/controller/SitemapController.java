package br.com.chfb.imoveis.coreapi.controller;

import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import br.com.chfb.imoveis.coreapi.service.SitemapService;

/**
 * Sitemap e robots.txt. Em produção o nginx serve {@code /sitemap.xml} e {@code /robots.txt} daqui; em dev, o proxy do
 * Angular. Público (GET sem Origin passa pela trava do /app/**).
 */
@RestController
public class SitemapController {

    // private: a resposta do /app/** leva o cookie XSRF-TOKEN, que não pode ficar em cache compartilhado
    private static final CacheControl CACHE = CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate();

    private final SitemapService sitemap;

    public SitemapController(SitemapService sitemap) {
        this.sitemap = sitemap;
    }

    @GetMapping(value = "/app/public/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> sitemap() {
        if (!sitemap.ligado()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CACHE).build();
        }
        return ResponseEntity.ok().cacheControl(CACHE).body(sitemap.sitemap(base()));
    }

    @GetMapping(value = "/app/public/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> robots() {
        return ResponseEntity.ok().cacheControl(CACHE).body(sitemap.robots(base(), sitemap.ligado()));
    }

    /** Origem pública vista pelo visitante (X-Forwarded-* do nginx, server.forward-headers-strategy=framework). */
    private static String base() {
        return ServletUriComponentsBuilder.fromCurrentContextPath().replacePath(null).build().toUriString();
    }
}
