package br.com.chfb.imoveis.coreapi.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.ConfiguracaoDto;
import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import br.com.chfb.imoveis.coreapi.repository.ConfiguracaoRepository;
import br.com.chfb.imoveis.sharedkernel.port.ModeracaoPolicy;

@Service
public class ConfiguracaoService implements ModeracaoPolicy {

    private final ConfiguracaoRepository repo;

    public ConfiguracaoService(ConfiguracaoRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public Configuracao atual() {
        return repo.findFirstByOrderByIdAsc().orElseGet(() -> {
            Configuracao c = new Configuracao();
            c.setNomeApp("Imóveis");
            return repo.save(c);
        });
    }

    @Transactional
    public ConfiguracaoDto obter() {
        return ConfiguracaoDto.of(atual());
    }

    @Transactional
    public ConfiguracaoDto salvar(ConfiguracaoDto dto) {
        Configuracao c = atual();
        dto.aplicar(c);
        return ConfiguracaoDto.of(repo.save(c));
    }

    @Override
    @Transactional
    public boolean exigeAprovacao() {
        return atual().isModerarAnuncios();
    }
}
