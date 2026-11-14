package br.com.chfb.imoveis.coreapi.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.chfb.imoveis.coreapi.service.UploadService;

/** Envio de imagens (CORRETOR e ADMIN). Devolve a URL pública do arquivo. */
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
}
