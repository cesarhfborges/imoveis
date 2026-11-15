package br.com.chfb.imoveis.moderation.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ConfigDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GravidadeDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GravidadeForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoForm;
import br.com.chfb.imoveis.moderation.entity.AcaoAutomatica;
import br.com.chfb.imoveis.moderation.entity.Gravidade;
import br.com.chfb.imoveis.moderation.entity.ModeracaoConfig;
import br.com.chfb.imoveis.moderation.entity.TipoDenuncia;
import br.com.chfb.imoveis.moderation.repository.DenunciaRepository;
import br.com.chfb.imoveis.moderation.repository.GravidadeRepository;
import br.com.chfb.imoveis.moderation.repository.ModeracaoConfigRepository;
import br.com.chfb.imoveis.moderation.repository.TipoDenunciaRepository;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;

/** Regras da moderação: configuração geral (automações) e tipos de denúncia com os seus prazos. */
@Service
public class RegrasService {

    private final ModeracaoConfigRepository configs;
    private final TipoDenunciaRepository tipos;
    private final DenunciaRepository denuncias;
    private final GravidadeRepository gravidades;

    public RegrasService(ModeracaoConfigRepository configs, TipoDenunciaRepository tipos, DenunciaRepository denuncias,
            GravidadeRepository gravidades) {
        this.configs = configs;
        this.tipos = tipos;
        this.denuncias = denuncias;
        this.gravidades = gravidades;
    }

    @Transactional
    public ModeracaoConfig config() {
        return configs.findById((short) 1).orElseGet(() -> configs.save(new ModeracaoConfig()));
    }

    @Transactional
    public ConfigDto obterConfig() {
        return dto(config());
    }

    @Transactional
    public ConfigDto salvarConfig(ConfigDto f) {
        if (f.etapa1Acao() == AcaoAutomatica.BANIR && f.etapa2Acao() != AcaoAutomatica.NENHUMA) {
            throw new BusinessException("Se a etapa 1 já bane o anúncio, a etapa 2 deve ser \"nenhuma ação\"");
        }
        ModeracaoConfig c = config();
        c.setAutomacaoAtiva(f.automacaoAtiva());
        c.setAprovarReativaAnuncio(f.aprovarReativaAnuncio());
        c.setAjusteSlaMinutos(f.ajusteSlaMinutos());
        c.setEtapa1Acao(f.etapa1Acao());
        c.setEtapa1PrazoMinutos(f.etapa1PrazoMinutos());
        c.setEtapa2Acao(f.etapa2Acao());
        c.setAvisoMinutos(f.avisoMinutos());
        return dto(configs.saveAndFlush(c));
    }

    private static ConfigDto dto(ModeracaoConfig c) {
        return new ConfigDto(c.isAutomacaoAtiva(), c.isAprovarReativaAnuncio(), c.getAjusteSlaMinutos(), c.getEtapa1Acao(),
                c.getEtapa1PrazoMinutos(), c.getEtapa2Acao(), c.getAvisoMinutos(), c.getAtualizadoEm());
    }

    // ------------------------------------------------------------------ tipos

    @Transactional(readOnly = true)
    public List<TipoDto> tipos() {
        return tipos.findAllByOrderByOrdemAscNomeAsc().stream().map(TipoDto::of).toList();
    }

    @Transactional
    public TipoDto salvarTipo(Long id, TipoForm f) {
        TipoDenuncia t = id == null ? new TipoDenuncia()
                : tipos.findById(id).orElseThrow(() -> new NotFoundException("Tipo de denúncia não encontrado"));
        t.setNome(f.nome().trim());
        t.setDescricao(f.descricao() == null || f.descricao().isBlank() ? null : f.descricao().trim());
        t.setGravidade(gravidades.findById(f.gravidadeId())
                .orElseThrow(() -> new BusinessException("Escolha uma gravidade válida")));
        t.setSlaMinutos(f.slaMinutos());
        t.setSuspenderAoAbrir(f.suspenderAoAbrir());
        t.setAtivo(f.ativo());
        t.setOrdem(f.ordem());
        return TipoDto.of(tipos.save(t));
    }

    // ------------------------------------------------------------------ gravidades

    @Transactional(readOnly = true)
    public List<GravidadeDto> gravidades() {
        return gravidades.findAllByOrderByOrdemAscNomeAsc().stream().map(GravidadeDto::of).toList();
    }

    /**
     * Cria ou altera uma gravidade. O nome é gravado sem espaços nas pontas e não pode repetir outro nem com
     * diferença só de maiúsculas, acentos ou espaços ("Grave", "grave", "Gráve " e "GRAVE" são o mesmo nome).
     */
    @Transactional
    public GravidadeDto salvarGravidade(Long id, GravidadeForm f) {
        String nome = Gravidade.limpar(f.nome());
        if (nome.isEmpty()) {
            throw new BusinessException("Informe o nome da gravidade");
        }
        String chave = Gravidade.normalizar(nome);
        boolean repetido = id == null ? gravidades.existsByNomeNormalizado(chave)
                : gravidades.existsByNomeNormalizadoAndIdNot(chave, id);
        if (repetido) {
            throw new BusinessException(409, "Já existe uma gravidade com esse nome (maiúsculas, acentos e espaços não diferenciam)");
        }
        if (f.banirContaAuto() && f.banirApos() == null) {
            throw new BusinessException("Informe depois de quantas denúncias procedentes a conta é banida");
        }
        Gravidade g = id == null ? new Gravidade()
                : gravidades.findById(id).orElseThrow(() -> new NotFoundException("Gravidade não encontrada"));
        g.setNome(nome);
        g.setCor(f.cor());
        g.setOrdem(f.ordem());
        g.setAtivo(f.ativo());
        g.setBanirContaAuto(f.banirContaAuto());
        g.setBanirApos(f.banirApos());
        g.setJanelaMeses(f.janelaMeses());
        return GravidadeDto.of(gravidades.saveAndFlush(g));
    }

    /** Gravidades em uso (tipos ou denúncias) não são apagadas: desative-as. */
    @Transactional
    public void excluirGravidade(Long id) {
        if (tipos.existsByGravidadeId(id) || denuncias.existsByGravidadeId(id)) {
            throw new BusinessException(409, "Esta gravidade está em uso por tipos ou denúncias; desative-a em vez de excluir");
        }
        gravidades.deleteById(id);
    }

    /** Tipos já usados em denúncias não são apagados (o histórico depende deles): desative-os. */
    @Transactional
    public void excluirTipo(Long id) {
        if (denuncias.existsByTipoId(id)) {
            throw new BusinessException(409, "Este tipo já foi usado em denúncias; desative-o em vez de excluir");
        }
        tipos.deleteById(id);
    }
}
