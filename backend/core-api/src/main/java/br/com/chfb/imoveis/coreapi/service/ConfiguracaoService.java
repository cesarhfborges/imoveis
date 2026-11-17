package br.com.chfb.imoveis.coreapi.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.ConfiguracaoDto;
import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import br.com.chfb.imoveis.coreapi.repository.ConfiguracaoRepository;
import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy;
import br.com.chfb.imoveis.sharedkernel.port.ModeracaoPolicy;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;

@Service
public class ConfiguracaoService implements ModeracaoPolicy, ExibicaoTelefonePolicy, RecursosSitePolicy {

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

    @Override
    @Transactional
    public Modo telefoneAnunciante() {
        return atual().getTelefoneAnunciante();
    }

    @Override
    @Transactional
    public boolean simulacaoFinanciamento() {
        return atual().isSimulacaoFinanciamento();
    }

    @Override
    @Transactional
    public boolean alertaQuedaPreco() {
        return atual().isAlertaQuedaPreco();
    }
}
