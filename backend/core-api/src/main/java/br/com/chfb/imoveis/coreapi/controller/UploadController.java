package br.com.chfb.imoveis.coreapi.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.chfb.imoveis.coreapi.service.UploadService;

/**
 * Envio de imagens. Devolve a URL pública do arquivo.
 * <ul>
 *     <li>{@code /app/uploads}: fotos de anúncios, logo etc. (CORRETOR e ADMIN);</li>
 *     <li>{@code /app/conta/foto} e {@code /app/conta/capa}: foto e capa do perfil (qualquer usuário logado, só JPG, PNG ou WEBP).</li>
 * </ul>
 */
@RestController
public class UploadController {

    private final UploadService uploads;

    public UploadController(UploadService uploads) {
        this.uploads = uploads;
    }

    @PostMapping("/app/uploads")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> enviar(@RequestParam("arquivo") MultipartFile arquivo) {
        return Map.of("url", uploads.salvar(arquivo));
    }

    /** Foto de perfil e capa do perfil público: mesmas regras (só JPG, PNG ou WEBP; a imagem chega já recortada). */
    @PostMapping({"/app/conta/foto", "/app/conta/capa"})
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> fotoDePerfil(@RequestParam("arquivo") MultipartFile arquivo) {
        return Map.of("url", uploads.salvar(arquivo, UploadService.FOTO_PERFIL));
    }
}
