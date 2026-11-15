package br.com.chfb.imoveis.listing.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.EstatisticasAnuncios;
import br.com.chfb.imoveis.listing.dto.FotoDto;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.dto.ImovelFiltro;
import br.com.chfb.imoveis.listing.dto.ImovelForm;
import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.dto.OpcoesBusca;
import br.com.chfb.imoveis.listing.dto.StatusForm;
import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.OrigemFoto;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;
import br.com.chfb.imoveis.listing.repository.ContatoRepository;
import br.com.chfb.imoveis.listing.repository.FavoritoRepository;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioEditadoEvent;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioExcluindoEvent;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider.AnuncianteInfo;
import br.com.chfb.imoveis.sharedkernel.port.ModeracaoPolicy;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

@Service
public class ImovelService {

    private final ImovelRepository imoveis;
    private final ContatoRepository contatos;
    private final FavoritoRepository favoritos;
    private final AnuncianteProvider anunciantes;
    private final ModeracaoPolicy moderacao;
    private final ApplicationEventPublisher eventos;

    /** Status aplicados pela moderação (só administradores tiram o anúncio deles). */
    private static final Set<StatusAnuncio> EM_MODERACAO = Set.of(StatusAnuncio.SUSPENSO, StatusAnuncio.BANIDO);

    public ImovelService(ImovelRepository imoveis, ContatoRepository contatos, FavoritoRepository favoritos,
            AnuncianteProvider anunciantes, ModeracaoPolicy moderacao, ApplicationEventPublisher eventos) {
        this.imoveis = imoveis;
        this.contatos = contatos;
        this.favoritos = favoritos;
        this.anunciantes = anunciantes;
        this.moderacao = moderacao;
        this.eventos = eventos;
    }

    // ------------------------------------------------------------------ busca

    @Transactional(readOnly = true)
    public PageResponse<ImovelResumo> buscarPublico(ImovelFiltro filtro) {
        return buscar(filtro, StatusAnuncio.ATIVO, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<ImovelResumo> buscarDoAnunciante(Long anuncianteId, ImovelFiltro filtro) {
        return buscar(filtro, null, anuncianteId);
    }

    @Transactional(readOnly = true)
    public PageResponse<ImovelResumo> buscarAdmin(ImovelFiltro filtro) {
        return buscar(filtro, null, null);
    }

    private PageResponse<ImovelResumo> buscar(ImovelFiltro filtro, StatusAnuncio status, Long anunciante) {
        PageRequest pagina = PageRequest.of(filtro.paginaOuPadrao(), filtro.tamanhoOuPadrao(), ordenacao(filtro.ordem()));
        Page<Imovel> resultado = imoveis.findAll(ImovelSpecifications.de(filtro, status, anunciante), pagina);
        Map<Long, AnuncianteInfo> nomes = anunciantes.buscarTodos(
                resultado.getContent().stream().map(Imovel::getAnuncianteId).distinct().toList());
        return PageResponse.of(resultado, i -> resumo(i, nomes.get(i.getAnuncianteId())));
    }

    @Transactional(readOnly = true)
    public List<ImovelResumo> destaques(int limite) {
        int max = Math.max(1, Math.min(limite, 24));
        ImovelFiltro somenteDestaques = new ImovelFiltro(null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, true, null, null, "recentes", 0, max);
        List<ImovelResumo> lista = new ArrayList<>(buscarPublico(somenteDestaques).content());
        if (lista.size() < max) {
            ImovelFiltro recentes = new ImovelFiltro(null, null, null, null, null, null, null, null, null, null, null,
                    null, null, null, null, null, null, "recentes", 0, max);
            Set<Long> ja = new LinkedHashSet<>(lista.stream().map(ImovelResumo::id).toList());
            for (ImovelResumo r : buscarPublico(recentes).content()) {
                if (lista.size() >= max) {
                    break;
                }
                if (ja.add(r.id())) {
                    lista.add(r);
                }
            }
        }
        return lista;
    }

    private Sort ordenacao(String ordem) {
        if (ordem == null) {
            return Sort.by(Sort.Order.desc("destaque"), Sort.Order.desc("criadoEm"));
        }
        return switch (ordem) {
            case "menor-preco" -> Sort.by(Sort.Order.asc("preco"));
            case "maior-preco" -> Sort.by(Sort.Order.desc("preco"));
            case "maior-area" -> Sort.by(Sort.Order.desc("areaUtil"));
            case "mais-vistos" -> Sort.by(Sort.Order.desc("visualizacoes"));
            case "recentes" -> Sort.by(Sort.Order.desc("criadoEm"));
            default -> Sort.by(Sort.Order.desc("destaque"), Sort.Order.desc("criadoEm"));
        };
    }

    @Transactional(readOnly = true)
    public OpcoesBusca opcoes() {
        List<OpcoesBusca.Opcao> tipos = Arrays.stream(TipoImovel.values())
                .map(t -> new OpcoesBusca.Opcao(t.name(), t.getDescricao())).toList();
        Map<String, OpcoesBusca.Localidade> mapa = new LinkedHashMap<>();
        for (Object[] linha : imoveis.localidades(StatusAnuncio.ATIVO)) {
            String uf = (String) linha[0];
            String cidade = (String) linha[1];
            String bairro = (String) linha[2];
            OpcoesBusca.Localidade loc = mapa.computeIfAbsent(uf + "|" + cidade,
                    k -> new OpcoesBusca.Localidade(uf, cidade, new ArrayList<>()));
            if (!loc.bairros().contains(bairro)) {
                loc.bairros().add(bairro);
            }
        }
        return new OpcoesBusca(tipos, new ArrayList<>(mapa.values()));
    }

    // ---------------------------------------------------------------- detalhe

    @Transactional
    public ImovelDetalhe detalhePublico(Long id) {
        Imovel imovel = imoveis.findById(id).filter(i -> i.getStatus() == StatusAnuncio.ATIVO)
                .orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        imoveis.incrementarVisualizacoes(id);
        return detalhe(imovel);
    }

    @Transactional(readOnly = true)
    public ImovelDetalhe detalheParaEdicao(Long id, AuthUser usuario) {
        return detalhe(carregarComPermissao(id, usuario));
    }

    // ------------------------------------------------------------------ escrita

    @Transactional
    public ImovelDetalhe criar(ImovelForm form, AuthUser usuario) {
        Imovel imovel = new Imovel();
        aplicar(imovel, form);
        imovel.setAnuncianteId(usuario.id());
        imovel.setStatus(!usuario.isAdmin() && moderacao.exigeAprovacao() ? StatusAnuncio.PENDENTE : StatusAnuncio.ATIVO);
        return detalhe(imoveis.save(imovel));
    }

    @Transactional
    public ImovelDetalhe atualizar(Long id, ImovelForm form, AuthUser usuario) {
        Imovel imovel = carregarComPermissao(id, usuario);
        if (!usuario.isAdmin() && imovel.getStatus() == StatusAnuncio.BANIDO) {
            throw new BusinessException(409, "Este anúncio foi banido pela moderação e não pode ser editado");
        }
        AlteracoesAnuncio antes = AlteracoesAnuncio.retrato(imovel);
        aplicar(imovel, form);
        ImovelDetalhe salvo = detalhe(imoveis.save(imovel));
        // a moderação registra o que mudou nas denúncias abertas (para conferir a correção pedida)
        List<AnuncioEditadoEvent.Alteracao> alteracoes = antes.comparar(AlteracoesAnuncio.retrato(imovel));
        if (!alteracoes.isEmpty()) {
            eventos.publishEvent(new AnuncioEditadoEvent(imovel.getId(), usuario.id(), usuario.isAdmin(), alteracoes));
        }
        return salvo;
    }

    @Transactional
    public ImovelDetalhe alterarStatus(Long id, StatusForm form, AuthUser usuario) {
        Imovel imovel = carregarComPermissao(id, usuario);
        if (usuario.isAdmin()) {
            if (EM_MODERACAO.contains(form.status()) && !EM_MODERACAO.contains(imovel.getStatus())) {
                imovel.setStatusAnterior(imovel.getStatus());
            } else if (!EM_MODERACAO.contains(form.status())) {
                imovel.setStatusAnterior(null);
            }
            imovel.setStatus(form.status());
            if (form.destaque() != null) {
                imovel.setDestaque(form.destaque());
            }
        } else {
            Set<StatusAnuncio> permitidos = Set.of(StatusAnuncio.ATIVO, StatusAnuncio.PAUSADO, StatusAnuncio.CONCLUIDO);
            if (!permitidos.contains(form.status())) {
                throw new ForbiddenException("Status não permitido para o anunciante");
            }
            if (imovel.getStatus() == StatusAnuncio.PENDENTE || imovel.getStatus() == StatusAnuncio.BLOQUEADO
                    || EM_MODERACAO.contains(imovel.getStatus())) {
                throw new BusinessException(409, "Este anúncio depende de uma decisão da administração");
            }
            imovel.setStatus(form.status());
        }
        return detalhe(imoveis.save(imovel));
    }

    @Transactional
    public void excluir(Long id, AuthUser usuario) {
        Imovel imovel = carregarComPermissao(id, usuario);
        if (!usuario.isAdmin() && imovel.getStatus() == StatusAnuncio.BANIDO) {
            throw new BusinessException(409, "Anúncios banidos pela moderação não podem ser excluídos");
        }
        // a moderação apaga as denúncias encerradas ou impede a exclusão se houver pendências
        eventos.publishEvent(new AnuncioExcluindoEvent(imovel.getId()));
        contatos.deleteByImovelId(imovel.getId());
        favoritos.deleteByImovelId(imovel.getId());
        imoveis.delete(imovel);
    }

    /**
     * Números do painel. {@code anuncianteId} nulo = todos os anúncios (administração); os contatos não lidos
     * são sempre só os de {@code donoContatos}, porque cada um lê apenas os contatos dos próprios anúncios.
     */
    @Transactional(readOnly = true)
    public EstatisticasAnuncios estatisticas(Long anuncianteId, Long donoContatos) {
        if (anuncianteId == null) {
            return new EstatisticasAnuncios(imoveis.count(), imoveis.countByStatus(StatusAnuncio.ATIVO),
                    imoveis.countByStatus(StatusAnuncio.PENDENTE), imoveis.countByStatus(StatusAnuncio.PAUSADO),
                    imoveis.somarVisualizacoes(), contatos.countByImovelAnuncianteIdAndLidoFalse(donoContatos));
        }
        return new EstatisticasAnuncios(imoveis.countByAnuncianteId(anuncianteId),
                imoveis.countByAnuncianteIdAndStatus(anuncianteId, StatusAnuncio.ATIVO),
                imoveis.countByAnuncianteIdAndStatus(anuncianteId, StatusAnuncio.PENDENTE),
                imoveis.countByAnuncianteIdAndStatus(anuncianteId, StatusAnuncio.PAUSADO),
                imoveis.somarVisualizacoes(anuncianteId), contatos.countByImovelAnuncianteIdAndLidoFalse(anuncianteId));
    }

    // ---------------------------------------------------------------- moderação

    /**
     * Suspende ou bane o anúncio (moderação), guardando o status de antes para uma eventual reativação.
     *
     * @return true se o status mudou
     */
    @Transactional
    public boolean aplicarModeracao(Long id, StatusAnuncio novo) {
        if (!EM_MODERACAO.contains(novo)) {
            throw new IllegalArgumentException("Status de moderação inválido: " + novo);
        }
        Imovel imovel = imoveis.findById(id).orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        if (imovel.getStatus() == novo || imovel.getStatus() == StatusAnuncio.BANIDO) {
            return false;
        }
        if (!EM_MODERACAO.contains(imovel.getStatus())) {
            imovel.setStatusAnterior(imovel.getStatus());
        }
        imovel.setStatus(novo);
        return true;
    }

    /**
     * Tira o anúncio da suspensão/banimento e volta ao status de antes (ATIVO se não houver registro).
     *
     * @return true se o status mudou
     */
    @Transactional
    public boolean reativarModeracao(Long id) {
        Imovel imovel = imoveis.findById(id).orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        if (!EM_MODERACAO.contains(imovel.getStatus())) {
            return false;
        }
        StatusAnuncio anterior = imovel.getStatusAnterior();
        imovel.setStatus(anterior == null || EM_MODERACAO.contains(anterior) ? StatusAnuncio.ATIVO : anterior);
        imovel.setStatusAnterior(null);
        return true;
    }

    // ---------------------------------------------------------------- apoio

    Imovel carregarComPermissao(Long id, AuthUser usuario) {
        Imovel imovel = imoveis.findById(id).orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        if (!usuario.isAdmin() && !Objects.equals(imovel.getAnuncianteId(), usuario.id())) {
            throw new ForbiddenException("Você não pode alterar este anúncio");
        }
        return imovel;
    }

    private void aplicar(Imovel i, ImovelForm f) {
        i.setTitulo(f.titulo().trim());
        i.setDescricao(f.descricao());
        i.setFinalidade(f.finalidade());
        i.setTipo(f.tipo());
        i.setPreco(f.preco());
        i.setCondominio(f.condominio());
        i.setIptu(f.iptu());
        i.setAreaUtil(f.areaUtil());
        i.setAreaTotal(f.areaTotal());
        i.setQuartos(f.quartos());
        i.setSuites(f.suites());
        i.setBanheiros(f.banheiros());
        i.setVagas(f.vagas());
        i.setUf(f.uf().trim().toUpperCase(Locale.ROOT));
        i.setCidade(f.cidade().trim());
        i.setBairro(f.bairro().trim());
        i.setEndereco(f.endereco());
        i.setCep(f.cep());
        i.setLatitude(f.latitude());
        i.setLongitude(f.longitude());
        i.setLancamento(f.lancamento());
        i.setAceitaFinanciamento(f.aceitaFinanciamento());
        i.setAceitaFgts(f.aceitaFgts());
        i.setAceitaPermuta(f.aceitaPermuta());
        i.setEscrituraRegistrada(f.escrituraRegistrada());
        i.setQuitado(f.quitado());
        i.getFotos().clear();
        if (f.fotos() != null) {
            f.fotos().stream().filter(Objects::nonNull).filter(x -> x.url() != null && !x.url().isBlank())
                    .map(x -> new FotoImovel(x.url().trim(), x.origem())).forEach(i.getFotos()::add);
        }
        i.getCaracteristicas().clear();
        if (f.caracteristicas() != null) {
            f.caracteristicas().stream().filter(Objects::nonNull).map(String::trim).filter(s -> !s.isEmpty())
                    .forEach(i.getCaracteristicas()::add);
        }
    }

    ImovelResumo resumo(Imovel i, AnuncianteInfo anunciante) {
        return new ImovelResumo(i.getId(), i.getCodigo(), i.getTitulo(), i.getFinalidade(), i.getTipo(),
                i.getTipo().getDescricao(), i.getStatus(), i.getPreco(), i.getCondominio(), i.getAreaUtil(),
                i.getQuartos(), i.getSuites(), i.getBanheiros(), i.getVagas(), i.getUf(), i.getCidade(), i.getBairro(),
                i.getEndereco(), i.getLatitude(), i.getLongitude(), resumir(i.getDescricao()),
                anunciante == null ? null : anunciante.creci(), anunciante == null ? null : anunciante.fotoUrl(),
                i.getFotos().isEmpty() ? null : i.getFotos().get(0).getUrl(),
                !i.getFotos().isEmpty() && i.getFotos().get(0).getOrigem() == OrigemFoto.IA, i.getFotos().size(), i.isLancamento(),
                i.isDestaque(), i.isAceitaFinanciamento(), i.isAceitaFgts(), i.getVisualizacoes(), i.getAnuncianteId(),
                anunciante == null ? null : anunciante.nome(), i.getCriadoEm());
    }

    private static String resumir(String texto) {
        if (texto == null) {
            return null;
        }
        String t = texto.replaceAll("\\s+", " ").trim();
        return t.length() <= 220 ? t : t.substring(0, 217) + "...";
    }

    @Transactional(readOnly = true)
    public List<ContagemTipo> contagemPorTipo(ImovelFiltro filtro) {
        ImovelFiltro semTipo = new ImovelFiltro(filtro.q(), filtro.finalidade(), null, filtro.uf(), filtro.cidade(),
                filtro.bairro(), filtro.quartos(), filtro.vagas(), filtro.suites(), filtro.precoMin(), filtro.precoMax(),
                filtro.areaMin(), filtro.areaMax(), filtro.lancamento(), null, null, null, null, 0, 1);
        List<ContagemTipo> lista = new ArrayList<>();
        for (TipoImovel t : TipoImovel.values()) {
            ImovelFiltro f = new ImovelFiltro(semTipo.q(), semTipo.finalidade(), List.of(t), semTipo.uf(),
                    semTipo.cidade(), semTipo.bairro(), semTipo.quartos(), semTipo.vagas(), semTipo.suites(),
                    semTipo.precoMin(), semTipo.precoMax(), semTipo.areaMin(), semTipo.areaMax(), semTipo.lancamento(),
                    null, null, null, null, 0, 1);
            long total = imoveis.count(ImovelSpecifications.de(f, StatusAnuncio.ATIVO, null));
            lista.add(new ContagemTipo(t.name(), t.getDescricao(), total));
        }
        lista.sort((a, b) -> Long.compare(b.total(), a.total()));
        return lista;
    }

    /** Pontos para o mapa (somente anúncios ativos com coordenadas), no máximo 500. */
    @Transactional(readOnly = true)
    public List<ImovelResumo> paraMapa(ImovelFiltro filtro) {
        ImovelFiltro f = new ImovelFiltro(filtro.q(), filtro.finalidade(), filtro.tipo(), filtro.uf(), filtro.cidade(),
                filtro.bairro(), filtro.quartos(), filtro.vagas(), filtro.suites(), filtro.precoMin(), filtro.precoMax(),
                filtro.areaMin(), filtro.areaMax(), filtro.lancamento(), null, null, null, filtro.ordem(), 0, 500);
        PageRequest pagina = PageRequest.of(0, 500, ordenacao(f.ordem()));
        org.springframework.data.jpa.domain.Specification<Imovel> comCoordenadas = (root, q, cb) -> cb.and(
                cb.isNotNull(root.get("latitude")), cb.isNotNull(root.get("longitude")));
        Page<Imovel> r = imoveis.findAll(ImovelSpecifications.de(f, StatusAnuncio.ATIVO, null).and(comCoordenadas), pagina);
        Map<Long, AnuncianteInfo> nomes = anunciantes.buscarTodos(
                r.getContent().stream().map(Imovel::getAnuncianteId).distinct().toList());
        return r.getContent().stream().map(i -> resumo(i, nomes.get(i.getAnuncianteId()))).toList();
    }

    /** Anúncios ativos parecidos: mesma finalidade e tipo, de preferência no mesmo bairro/cidade. */
    @Transactional(readOnly = true)
    public List<ImovelResumo> similares(Long id, int limite) {
        Imovel base = imoveis.findById(id).orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        List<ImovelResumo> lista = new ArrayList<>();
        Set<Long> ja = new LinkedHashSet<>(List.of(id));
        for (String bairro : new String[] {base.getBairro(), null}) {
            ImovelFiltro f = new ImovelFiltro(null, base.getFinalidade(), List.of(base.getTipo()), base.getUf(),
                    base.getCidade(), bairro, null, null, null, null, null, null, null, null, null, null, null,
                    "recentes", 0, limite + 1);
            for (ImovelResumo r : buscarPublico(f).content()) {
                if (lista.size() < limite && ja.add(r.id())) {
                    lista.add(r);
                }
            }
        }
        return lista;
    }

    public record ContagemTipo(String tipo, String label, long total) {
    }

    ImovelResumo resumo(Imovel i) {
        return resumo(i, anunciantes.buscar(i.getAnuncianteId()).orElse(null));
    }

    private ImovelDetalhe detalhe(Imovel i) {
        ImovelDetalhe.Anunciante anunciante = anunciantes.buscar(i.getAnuncianteId())
                .map(a -> new ImovelDetalhe.Anunciante(a.id(), a.nome(), a.telefone(), a.creci(), a.fotoUrl()))
                .orElse(null);
        return new ImovelDetalhe(i.getId(), i.getCodigo(), i.getTitulo(), i.getDescricao(), i.getFinalidade(),
                i.getTipo(), i.getTipo().getDescricao(), i.getStatus(), i.getPreco(), i.getCondominio(), i.getIptu(),
                i.getAreaUtil(), i.getAreaTotal(), i.getQuartos(), i.getSuites(), i.getBanheiros(), i.getVagas(),
                i.getUf(), i.getCidade(), i.getBairro(), i.getEndereco(), i.getCep(), i.getLatitude(), i.getLongitude(),
                i.isLancamento(), i.isDestaque(),
                i.isAceitaFinanciamento(), i.isAceitaFgts(), i.isAceitaPermuta(), i.isEscrituraRegistrada(), i.isQuitado(),
                i.getFotos().stream().map(FotoDto::of).toList(), Set.copyOf(i.getCaracteristicas()),
                i.getVisualizacoes(), anunciante, i.getCriadoEm(), i.getAtualizadoEm());
    }
}
