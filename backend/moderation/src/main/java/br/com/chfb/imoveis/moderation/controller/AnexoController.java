package br.com.chfb.imoveis.moderation.controller;

import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.chfb.imoveis.moderation.service.AnexoService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Anexos das pendências (imagens e PDF): envio pelo anunciante/moderação e download com controle de acesso. */
@RestController
public class AnexoController {

    private final AnexoService anexos;

    public AnexoController(AnexoService anexos) {
        this.anexos = anexos;
    }

    @PostMapping("/app/denuncias/anexos")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> enviar(@RequestParam("arquivo") MultipartFile arquivo, @AuthenticationPrincipal AuthUser u) {
        return Map.of("url", anexos.salvar(arquivo, u));
    }

    @GetMapping("/app/denuncias/anexos/{nome}")
    public ResponseEntity<Resource> abrir(@PathVariable String nome, @AuthenticationPrincipal AuthUser u) {
        AnexoService.Arquivo a = anexos.abrir(nome, u);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(a.nomeOriginal() == null || a.nomeOriginal().isBlank() ? nome : a.nomeOriginal(),
                                java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(new FileSystemResource(a.caminho()));
    }
}
