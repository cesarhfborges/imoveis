package br.com.chfb.imoveis.coreapi.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.coreapi.dto.ConfiguracaoDto;
import br.com.chfb.imoveis.coreapi.service.ConfiguracaoService;
import jakarta.validation.Valid;

/** Nome do app, logos, SEO, contato e tema: leitura pública, escrita só por ADMIN. */
@RestController
public class ConfiguracaoController {

    private final ConfiguracaoService config;

    public ConfiguracaoController(ConfiguracaoService config) {
        this.config = config;
    }

    @GetMapping({"/app/public/configuracao", "/app/admin/configuracao"})
    public ConfiguracaoDto obter() {
        return config.obter();
    }

    @PutMapping("/app/admin/configuracao")
    public ConfiguracaoDto salvar(@Valid @RequestBody ConfiguracaoDto dto) {
        return config.salvar(dto);
    }
}
