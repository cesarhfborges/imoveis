package br.com.chfb.imoveis.coreapi.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.AnunciantePerfil;
import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.AnuncianteResumo;
import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.ContatoAnunciante;
import br.com.chfb.imoveis.coreapi.service.AnunciantePublicoService;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Diretório (/imobiliarias) e perfil público (/anunciante/{id}) de corretores e imobiliárias. */
@RestController
@RequestMapping("/app/public/anunciantes")
public class AnunciantePublicoController {

    private final AnunciantePublicoService anunciantes;

    public AnunciantePublicoController(AnunciantePublicoService anunciantes) {
        this.anunciantes = anunciantes;
    }

    @GetMapping
    public List<AnuncianteResumo> listar(@RequestParam(required = false) String tipo,
            @RequestParam(required = false) String cidade, @RequestParam(required = false) String uf,
            @RequestParam(required = false) String q) {
        return anunciantes.listar(tipo, cidade, uf, q);
    }

    @GetMapping("/{id}")
    public AnunciantePerfil perfil(@PathVariable Long id, @AuthenticationPrincipal AuthUser usuario) {
        return anunciantes.perfil(id, usuario != null);
    }

    @GetMapping("/{id}/telefone")
    public ContatoAnunciante telefone(@PathVariable Long id, @AuthenticationPrincipal AuthUser usuario) {
        return anunciantes.telefone(id, usuario != null);
    }
}
