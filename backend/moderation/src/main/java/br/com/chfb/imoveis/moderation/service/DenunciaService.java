package br.com.chfb.imoveis.moderation.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.AcaoImovelForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ApuracaoForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GravidadeResumo;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ProcedenteForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ReaberturaForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ProcedentesPorGravidade;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.AnuncianteDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ContadorDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DecisaoForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DenunciaDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DenunciaForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DenunciaResumo;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GrupoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.HistoricoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ImovelInfo;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.MensagemAdminForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.MensagemDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.MinhaDenunciaDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.PendenciasImovelDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.PrazoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.RespostaForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoPublicoDto;
import br.com.chfb.imoveis.moderation.entity.AcaoAutomatica;
import br.com.chfb.imoveis.moderation.entity.Denuncia;
import br.com.chfb.imoveis.moderation.entity.DenunciaMensagem;
import br.com.chfb.imoveis.moderation.entity.Gravidade;
import br.com.chfb.imoveis.moderation.entity.MedidaAnuncio;
import br.com.chfb.imoveis.moderation.entity.Natureza;
import br.com.chfb.imoveis.moderation.entity.ModeracaoConfig;
import br.com.chfb.imoveis.moderation.entity.PapelMensagem;
import br.com.chfb.imoveis.moderation.entity.PenalidadeConta;
import br.com.chfb.imoveis.moderation.entity.StatusDenuncia;
import br.com.chfb.imoveis.moderation.entity.TipoDenuncia;
import br.com.chfb.imoveis.moderation.repository.DenunciaRepository;
import br.com.chfb.imoveis.platform.texto.TextoRico;
import br.com.chfb.imoveis.moderation.repository.GravidadeRepository;
import br.com.chfb.imoveis.moderation.repository.TipoDenunciaRepository;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioEditadoEvent;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioExcluindoEvent;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider.AnuncianteInfo;
import br.com.chfb.imoveis.sharedkernel.port.ContaModeracao;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.port.TempoReal;
import br.com.chfb.imoveis.sharedkernel.port.UsuarioDiretorio;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Fluxo das denúncias:
 * <pre>
 * usuário denuncia ─▶ AGUARDANDO_ANUNCIANTE (prazo correndo)
 *     anunciante responde ─▶ EM_ANALISE (prazo parado; a moderação é avisada)
 *         admin conversa ─▶ AGUARDANDO_ANUNCIANTE (prazo retoma)   admin abre apuração ─▶ EM_APURACAO
 *     prazo vence ─▶ ações automáticas configuráveis (etapa 1 e etapa 2)
 *
 * julgamento (a qualquer momento enquanto aberta, com ou sem resposta do anunciante):
 *     improcedente ─▶ IMPROCEDENTE            solução aprovada ─▶ RESOLVIDA
 *     procedente + correção ─▶ AGUARDANDO_ANUNCIANTE (prazo da correção) ─▶ correção aceita ─▶ PROCEDENTE
 *     procedente + manter / suspender / remover o anúncio ─▶ PROCEDENTE
 *     procedente: penalidade na conta = nenhuma, strike (regra da gravidade) ou banimento direto
 * encerrada ─▶ rever julgamento ─▶ EM_ANALISE (sem julgamento; o strike sai da contagem)
 * admin pode suspender, reativar ou banir o anúncio a qualquer momento (banir encerra as pendências).
 * </pre>
 * Tempo real: cada mudança vai para a sala do anúncio ({@code presence-denuncias.imovel.{id}}: anunciante e
 * moderação, sem notas internas nem dados do denunciante) e para o canal da moderação
 * ({@code private-admin.denuncias.imovel.{id}}: versão completa). Eventos: {@code denuncia.atualizada}
 * (a denúncia inteira, com a conversa) e {@code imovel.atualizado}. Os contadores vão em
 * {@code private-admin.moderacao} ({@code contador}) e no canal do anunciante ({@code pendencias.contador}).
 */
@Service
public class DenunciaService {

    private static final Set<StatusDenuncia> ABERTAS = StatusDenuncia.ABERTAS;
    private static final Set<StatusDenuncia> TODAS = EnumSet.allOf(StatusDenuncia.class);

    private final JsonMapper json;
    private final DenunciaRepository denuncias;
    private final TipoDenunciaRepository tipos;
    private final ImovelRepository imoveis;
    private final ImovelService anuncios;
    private final PrazoService prazos;
    private final RegrasService regras;
    private final Notificador notificador;
    private final UsuarioDiretorio diretorio;
    private final AnuncianteProvider usuarios;
    private final TempoReal tempoReal;
    private final GravidadeRepository gravidades;
    private final ContaModeracao contas;
    private final AnexoService anexosService;

    public static String salaDoImovel(Long imovelId) {
        return "presence-denuncias.imovel." + imovelId;
    }

    public static String canalAdminDoImovel(Long imovelId) {
        return "private-admin.denuncias.imovel." + imovelId;
    }

    public static final String CANAL_MODERACAO = "private-admin.moderacao";

    public DenunciaService(DenunciaRepository denuncias, TipoDenunciaRepository tipos, ImovelRepository imoveis,
            ImovelService anuncios, PrazoService prazos, RegrasService regras, Notificador notificador,
            UsuarioDiretorio diretorio, AnuncianteProvider usuarios, TempoReal tempoReal, GravidadeRepository gravidades,
            ContaModeracao contas, AnexoService anexosService, JsonMapper json) {
        this.json = json;
        this.anexosService = anexosService;
        this.tempoReal = tempoReal;
        this.gravidades = gravidades;
        this.contas = contas;
        this.denuncias = denuncias;
        this.tipos = tipos;
        this.imoveis = imoveis;
        this.anuncios = anuncios;
        this.prazos = prazos;
        this.regras = regras;
        this.notificador = notificador;
        this.diretorio = diretorio;
        this.usuarios = usuarios;
    }

    // ================================================================== denunciante

    @Transactional(readOnly = true)
    public List<TipoPublicoDto> tiposAtivos() {
        return tipos.findByAtivoTrueOrderByOrdemAscNomeAsc().stream().map(TipoPublicoDto::of).toList();
    }

    @Transactional
    public MinhaDenunciaDto denunciar(DenunciaForm form, AuthUser u) {
        Imovel imovel = imoveis.findById(form.imovelId()).filter(i -> i.getStatus() == StatusAnuncio.ATIVO)
                .orElseThrow(() -> new NotFoundException("Anúncio não encontrado"));
        if (Objects.equals(imovel.getAnuncianteId(), u.id())) {
            throw new BusinessException("Você não pode denunciar o próprio anúncio");
        }
        TipoDenuncia tipo = tipos.findById(form.tipoId()).filter(TipoDenuncia::isAtivo)
                .orElseThrow(() -> new BusinessException("Escolha um tipo de denúncia válido"));
        if (denuncias.existsByImovelIdAndDenuncianteIdAndTipoIdAndStatusIn(imovel.getId(), u.id(), tipo.getId(), ABERTAS)) {
            throw new BusinessException(409, "Você já tem uma denúncia deste tipo em aberto para este anúncio");
        }

        Instant agora = Instant.now();
        Denuncia d = new Denuncia();
        d.setImovelId(imovel.getId());
        d.setDenuncianteId(u.id());
        d.setTipo(tipo);
        d.setGravidade(tipo.getGravidade());
        d.setDescricao(form.descricao().trim());
        d.setStatus(StatusDenuncia.AGUARDANDO_ANUNCIANTE);
        prazos.iniciar(d, tipo.getSlaMinutos(), agora);
        d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Denúncia registrada. Prazo para o anunciante responder: "
                + PrazoService.duracao(tipo.getSlaMinutos()) + " (até " + prazos.formatar(d.getPrazoEm()) + ").", null, false);
        denuncias.save(d);

        boolean suspenso = false;
        if (tipo.isSuspenderAoAbrir() && anuncios.aplicarModeracao(imovel.getId(), StatusAnuncio.SUSPENSO)) {
            suspenso = true;
            d.adicionarMensagem(PapelMensagem.SISTEMA, null,
                    "Anúncio suspenso preventivamente até a análise (tipo de denúncia grave).", null, false);
        }

        notificarAnunciante(imovel, d, "DENUNCIA_RECEBIDA", "Seu anúncio recebeu uma denúncia",
                tipo.getNome() + ". Responda até " + prazos.formatar(d.getPrazoEm()) + "."
                        + (suspenso ? " O anúncio foi suspenso até a análise." : ""),
                "pi-flag");
        notificarAdmins(imovel, d, "DENUNCIA_NOVA", "Nova denúncia: " + tipo.getNome(),
                "Anúncio " + imovel.getCodigo() + " - " + imovel.getTitulo() + (suspenso ? " (suspenso preventivamente)" : ""),
                "pi-flag");
        sincronizar(imovel, List.of(d));
        return minha(d, imovel);
    }

    @Transactional(readOnly = true)
    public List<MinhaDenunciaDto> minhas(AuthUser u) {
        List<Denuncia> lista = denuncias.findByDenuncianteIdOrderByCriadoEmDesc(u.id());
        Map<Long, Imovel> mapa = imoveisPorId(lista.stream().map(Denuncia::getImovelId).toList());
        return lista.stream().map(d -> minha(d, mapa.get(d.getImovelId()))).toList();
    }

    private MinhaDenunciaDto minha(Denuncia d, Imovel imovel) {
        String situacao = switch (d.getStatus()) {
            // o denunciante só sabe se está em análise ou resolvida, nunca o desfecho
            case AGUARDANDO_ANUNCIANTE, EM_ANALISE, EM_APURACAO -> "EM_ANALISE";
            case RESOLVIDA, IMPROCEDENTE, PROCEDENTE, ANUNCIO_BANIDO -> "RESOLVIDA";
        };
        return new MinhaDenunciaDto(d.getId(), info(imovel), d.getTipo().getNome(), situacao, d.getCriadoEm(),
                d.getResolvidoEm());
    }

    // ================================================================== anunciante

    @Transactional(readOnly = true)
    public List<GrupoDto> pendenciasDoAnunciante(AuthUser u, boolean somenteAbertas) {
        List<Long> ids = denuncias.imoveisDoAnuncianteComStatus(u.id(), somenteAbertas ? ABERTAS : TODAS);
        return grupos(ids, somenteAbertas ? ABERTAS : TODAS);
    }

    @Transactional(readOnly = true)
    public PendenciasImovelDto pendenciasDoImovel(Long imovelId, AuthUser u) {
        Imovel imovel = imoveis.findById(imovelId).orElseThrow(() -> new NotFoundException("Anúncio não encontrado"));
        if (!Objects.equals(imovel.getAnuncianteId(), u.id())) {
            throw new ForbiddenException("Este anúncio não é seu");
        }
        Instant agora = Instant.now();
        // nomes/fotos só do próprio anunciante (a moderação aparece como "Moderação")
        Map<Long, AnuncianteInfo> eu = usuarios.buscarTodos(Set.of(imovel.getAnuncianteId()));
        List<DenunciaDto> lista = ordenar(denuncias.findByImovelIdOrderByCriadoEmAsc(imovelId)).stream()
                .map(d -> dto(d, agora, false, eu)).toList();
        return new PendenciasImovelDto(info(imovel), null, null, lista);
    }

    /** O anunciante responde (ou informa a correção) de uma ou várias pendências de uma vez. */
    @Transactional
    public void responder(RespostaForm form, AuthUser u) {
        Set<Long> ids = new HashSet<>(form.denuncias());
        List<Denuncia> lista = denuncias.findAllById(ids);
        if (lista.size() != ids.size()) {
            throw new NotFoundException("Denúncia não encontrada");
        }
        Map<Long, Imovel> mapa = imoveisPorId(lista.stream().map(Denuncia::getImovelId).toList());
        String anexos = anexosService.validar(form.anexos(), u.id());
        String texto = textoValido(form.texto());
        Map<Long, Integer> respondidasPorImovel = new LinkedHashMap<>();
        for (Denuncia d : lista) {
            Imovel imovel = mapa.get(d.getImovelId());
            if (imovel == null || !Objects.equals(imovel.getAnuncianteId(), u.id())) {
                throw new ForbiddenException("Esta denúncia não é de um anúncio seu");
            }
            if (!d.getStatus().aberta()) {
                throw new BusinessException(409, "A denúncia \"" + d.getTipo().getNome() + "\" já foi encerrada");
            }
            d.adicionarMensagem(PapelMensagem.ANUNCIANTE, u.id(), texto, anexos, false);
            if (d.getStatus() == StatusDenuncia.AGUARDANDO_ANUNCIANTE) {
                d.setStatus(StatusDenuncia.EM_ANALISE);
                prazos.pausar(d, Instant.now());
            }
            respondidasPorImovel.merge(imovel.getId(), 1, Integer::sum);
        }
        respondidasPorImovel.keySet().forEach(imovelId -> sincronizar(mapa.get(imovelId),
                lista.stream().filter(d -> d.getImovelId().equals(imovelId)).toList()));
        respondidasPorImovel.forEach((imovelId, n) -> {
            Imovel imovel = mapa.get(imovelId);
            notificador.notificarTodos(diretorio.administradores(), new Notificador.Nova(null, "DENUNCIA_RESPOSTA",
                    "Resposta do anunciante para analisar",
                    n + (n == 1 ? " pendência" : " pendências") + " do anúncio " + imovel.getCodigo() + " - " + imovel.getTitulo(),
                    "pi-comments", "/admin/denuncias/" + imovelId, "IMOVEL", imovelId));
        });
    }

    @Transactional(readOnly = true)
    public ContadorDto contadorDoAnunciante(AuthUser u) {
        return contadorDoAnunciante(u.id());
    }

    private ContadorDto contadorDoAnunciante(Long anuncianteId) {
        List<Long> ids = denuncias.imoveisDoAnuncianteComStatus(anuncianteId, ABERTAS);
        if (ids.isEmpty()) {
            return new ContadorDto(0, 0);
        }
        List<Denuncia> abertas = denuncias.findByImovelIdInOrderByCriadoEmAsc(ids).stream()
                .filter(d -> d.getStatus().aberta()).toList();
        long aguardando = abertas.stream().filter(d -> d.getStatus() == StatusDenuncia.AGUARDANDO_ANUNCIANTE).count();
        return new ContadorDto(aguardando, abertas.size());
    }

    // ================================================================== administração

    /**
     * Pendências agrupadas por anúncio.
     *
     * @param filtro ABERTAS (padrão), EM_ANALISE, AGUARDANDO_ANUNCIANTE, ENCERRADAS ou TODAS
     */
    @Transactional(readOnly = true)
    public PageResponse<GrupoDto> gruposAdmin(String filtro, int page, int size) {
        Set<StatusDenuncia> status = switch (filtro == null ? "ABERTAS" : filtro) {
            case "EM_ANALISE" -> EnumSet.of(StatusDenuncia.EM_ANALISE);
            case "EM_APURACAO" -> EnumSet.of(StatusDenuncia.EM_APURACAO);
            case "AGUARDANDO_ANUNCIANTE" -> EnumSet.of(StatusDenuncia.AGUARDANDO_ANUNCIANTE);
            case "ENCERRADAS" -> EnumSet.complementOf(EnumSet.copyOf(ABERTAS));
            case "TODAS" -> TODAS;
            default -> ABERTAS;
        };
        List<Long> ids = denuncias.imoveisComStatus(status);
        int tamanho = Math.min(Math.max(size, 1), 50);
        int pagina = Math.max(page, 0);
        int de = Math.min(pagina * tamanho, ids.size());
        int ate = Math.min(de + tamanho, ids.size());
        List<GrupoDto> conteudo = grupos(ids.subList(de, ate), status);
        return new PageResponse<>(conteudo, pagina, tamanho, ids.size(), (ids.size() + tamanho - 1) / tamanho);
    }

    @Transactional(readOnly = true)
    public ContadorDto contadorAdmin() {
        // aguardando a moderação: respostas a analisar e apurações em andamento
        return new ContadorDto(denuncias.countByStatusIn(EnumSet.of(StatusDenuncia.EM_ANALISE, StatusDenuncia.EM_APURACAO)),
                denuncias.countByStatusIn(ABERTAS));
    }

    @Transactional(readOnly = true)
    public PendenciasImovelDto pendenciasAdmin(Long imovelId) {
        Imovel imovel = imoveis.findById(imovelId).orElseThrow(() -> new NotFoundException("Anúncio não encontrado"));
        List<Denuncia> lista = ordenar(denuncias.findByImovelIdOrderByCriadoEmAsc(imovelId));
        Set<Long> pessoas = new HashSet<>();
        pessoas.add(imovel.getAnuncianteId());
        lista.forEach(d -> {
            pessoas.add(d.getDenuncianteId());
            d.getMensagens().stream().map(DenunciaMensagem::getAutorId).filter(Objects::nonNull).forEach(pessoas::add);
        });
        Map<Long, AnuncianteInfo> nomes = usuarios.buscarTodos(pessoas);
        Instant agora = Instant.now();
        AnuncianteInfo a = nomes.get(imovel.getAnuncianteId());
        AnuncianteDto anunciante = a == null ? null : new AnuncianteDto(a.id(), a.nome(), a.email(), a.telefone(), a.creci());
        return new PendenciasImovelDto(info(imovel), anunciante, historico(imovel.getAnuncianteId()),
                lista.stream().map(d -> dto(d, agora, true, nomes)).toList());
    }

    @Transactional
    public DenunciaDto mensagemAdmin(Long id, MensagemAdminForm form, AuthUser admin) {
        Denuncia d = carregar(id);
        if (!d.getStatus().aberta() && !form.interna()) {
            throw new BusinessException(409, "A denúncia está encerrada: só é possível registrar notas internas");
        }
        d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), textoValido(form.texto()),
                anexosService.validar(form.anexos(), admin.id()), form.interna());
        if (!form.interna()) {
            Imovel imovel = imovel(d.getImovelId());
            String detalhe;
            if (d.getStatus() == StatusDenuncia.EM_ANALISE || d.getStatus() == StatusDenuncia.EM_APURACAO) {
                // a moderação respondeu: o caso volta para o anunciante e o prazo retoma de onde parou
                d.setStatus(StatusDenuncia.AGUARDANDO_ANUNCIANTE);
                d.setApuracaoPrazoEm(null);
                prazos.retomar(d, regras.config().getAjusteSlaMinutos(), Instant.now());
                d.adicionarMensagem(PapelMensagem.SISTEMA, null, "O caso voltou para o anunciante. Prazo retomado até "
                        + prazos.formatar(d.getPrazoEm()) + ".", null, false);
            }
            detalhe = d.getTipo().getNome() + (d.getPrazoEm() != null ? ". Responda até " + prazos.formatar(d.getPrazoEm()) + "." : ".");
            notificarAnunciante(imovel, d, "DENUNCIA_MENSAGEM", "Nova mensagem da moderação", detalhe, "pi-comment");
        }
        sincronizar(imovel(d.getImovelId()), List.of(d));
        return dtoAdmin(d);
    }

    /**
     * Aprova a solução do anunciante. Com correção solicitada (procedente), aceita a correção e encerra como
     * procedente; senão, encerra como resolvida (sem julgamento).
     */
    @Transactional
    public DenunciaDto aprovar(Long id, DecisaoForm form, AuthUser admin) {
        Denuncia d = carregar(id);
        if (d.correcaoPendente()) {
            return decidir(d, StatusDenuncia.PROCEDENTE, form, admin, "Correção aceita pela moderação. Denúncia encerrada como procedente.");
        }
        return decidir(d, StatusDenuncia.RESOLVIDA, form, admin, "Solução aprovada pela moderação.");
    }

    /** Julga improcedente: encerra sem penalidade (desfaz um julgamento procedente ainda aberto, se houver). */
    @Transactional
    public DenunciaDto improcedente(Long id, DecisaoForm form, AuthUser admin) {
        return decidir(carregar(id), StatusDenuncia.IMPROCEDENTE, form, admin, "Denúncia julgada improcedente pela moderação.");
    }

    private DenunciaDto decidir(Denuncia d, StatusDenuncia novo, DecisaoForm form, AuthUser admin, String registro) {
        if (!d.getStatus().aberta()) {
            throw new BusinessException(409, "A denúncia já foi encerrada. Para mudar o julgamento, use \"Rever julgamento\".");
        }
        if (novo != StatusDenuncia.PROCEDENTE) {
            d.limparJulgamento();
        }
        d.setApuracaoPrazoEm(null);
        String texto = form == null || TextoRico.vazio(form.texto()) ? null : textoValido(form.texto());
        if (texto != null) {
            d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), texto, null, false);
        }
        // aceitar a correção sem texto novo: a conclusão continua sendo a fundamentação do julgamento procedente
        String conclusao = texto == null && novo == StatusDenuncia.PROCEDENTE ? d.getConclusao() : texto;
        encerrar(d, novo, admin.id(), conclusao, registro);
        Imovel imovel = imovel(d.getImovelId());
        notificarAnunciante(imovel, d, "DENUNCIA_ENCERRADA",
                switch (novo) {
                    case RESOLVIDA -> "Pendência resolvida";
                    case PROCEDENTE -> "Correção aceita";
                    default -> "Denúncia arquivada";
                },
                d.getTipo().getNome() + " - " + registro, "pi-check-circle");
        notificarDenunciante(d, imovel, "Sua denúncia foi resolvida",
                "Obrigado por ajudar a manter os anúncios confiáveis.");
        // correção aceita: o anúncio suspenso até a correção volta ao ar (se não restar outra pendência)
        if ((novo == StatusDenuncia.PROCEDENTE || regras.config().isAprovarReativaAnuncio()) && reativarSePossivel(imovel)) {
            d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Anúncio de volta ao ar: não restou pendência aberta nele.", null, false);
        }
        sincronizar(imovel, List.of(d));
        return dtoAdmin(d);
    }

    /** Suspender, reativar ou banir o anúncio (decisão do administrador). */
    @Transactional
    public PendenciasImovelDto acaoNoImovel(Long imovelId, AcaoImovelForm form, AuthUser admin) {
        Imovel imovel = imovel(imovelId);
        // o motivo entra em mensagens do sistema e notificações: só o texto
        String motivo = TextoRico.vazio(form.motivo()) ? null : TextoRico.resumo(form.motivo(), 1000);
        switch (form.acao()) {
            case SUSPENDER -> {
                if (!anuncios.aplicarModeracao(imovelId, StatusAnuncio.SUSPENSO)) {
                    throw new BusinessException(409, "O anúncio já está suspenso ou banido");
                }
                registrarNasAbertas(imovelId, "Anúncio suspenso pela moderação." + (motivo == null ? "" : " Motivo: " + motivo));
                notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "ANUNCIO_SUSPENSO",
                        "Seu anúncio foi suspenso", imovel.getCodigo() + " - " + imovel.getTitulo()
                                + (motivo == null ? "" : ". Motivo: " + motivo),
                        "pi-pause-circle", "/conta/pendencias/" + imovelId, "IMOVEL", imovelId));
            }
            case REATIVAR -> {
                if (!anuncios.reativarModeracao(imovelId)) {
                    throw new BusinessException(409, "O anúncio não está suspenso nem banido");
                }
                registrarNasAbertas(imovelId, "Anúncio reativado pela moderação.");
                notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "ANUNCIO_REATIVADO",
                        "Seu anúncio voltou a ser exibido", imovel.getCodigo() + " - " + imovel.getTitulo(),
                        "pi-play-circle", "/conta/anuncios", "IMOVEL", imovelId));
            }
            case BANIR -> banir(imovel, admin.id(), "Anúncio banido pela moderação." + (motivo == null ? "" : " Motivo: " + motivo));
        }
        sincronizar(imovel, denuncias.findByImovelIdOrderByCriadoEmAsc(imovelId));
        return pendenciasAdmin(imovelId);
    }

    /**
     * Abre a apuração: a empresa vai verificar (ex.: visita ao imóvel). O prazo do anunciante para; o prazo
     * interno, se informado, só alerta a moderação.
     */
    @Transactional
    public DenunciaDto abrirApuracao(Long id, ApuracaoForm form, AuthUser admin) {
        Denuncia d = carregar(id);
        if (!d.getStatus().aberta()) {
            throw new BusinessException(409, "A denúncia já foi encerrada");
        }
        Instant agora = Instant.now();
        if (d.getStatus() == StatusDenuncia.AGUARDANDO_ANUNCIANTE) {
            prazos.pausar(d, agora);
        }
        d.setStatus(StatusDenuncia.EM_APURACAO);
        d.setApuracaoPrazoEm(form.prazoMinutos() == null ? null : prazos.somar(agora, form.prazoMinutos()));
        d.setApuracaoAvisoEnviado(false);
        d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), textoValido(form.texto()), null, form.interna());
        d.adicionarMensagem(PapelMensagem.SISTEMA, null,
                "Apuração aberta pela moderação. O prazo do anunciante fica parado enquanto a verificação acontece.", null, false);
        if (d.getApuracaoPrazoEm() != null) {
            d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Prazo interno da apuração: " + prazos.formatar(d.getApuracaoPrazoEm()) + ".",
                    null, true);
        }
        Imovel imovel = imovel(d.getImovelId());
        notificarAnunciante(imovel, d, "DENUNCIA_APURACAO", "Denúncia em apuração",
                d.getTipo().getNome() + ". A moderação está verificando; o seu prazo fica parado.", "pi-search");
        sincronizar(imovel, List.of(d));
        return dtoAdmin(d);
    }

    /**
     * Julga a denúncia procedente, a qualquer momento enquanto aberta (com ou sem resposta do anunciante; também
     * altera um julgamento procedente ainda aberto). Registra a natureza, aplica a medida no anúncio e a penalidade
     * na conta:
     * <ul>
     * <li>medida CORRIGIR: a denúncia continua aberta, aguardando a correção no prazo (o anúncio pode sair do ar
     * até lá); a moderação depois aceita a correção ({@link #aprovar}) ou julga de novo;</li>
     * <li>MANTER, SUSPENDER, BANIR: encerra como procedente;</li>
     * <li>penalidade STRIKE confere a regra de banimento automático da gravidade; BANIR_CONTA bane a conta na
     * hora.</li>
     * </ul>
     */
    @Transactional
    public DenunciaDto procedente(Long id, ProcedenteForm form, AuthUser admin) {
        Denuncia d = carregar(id);
        if (!d.getStatus().aberta()) {
            throw new BusinessException(409, "A denúncia já foi encerrada. Para mudar o julgamento, use \"Rever julgamento\".");
        }
        if (form.medida() == MedidaAnuncio.CORRIGIR && form.penalidade() == PenalidadeConta.BANIR_CONTA) {
            throw new BusinessException("Com a conta banida não há correção a pedir: remova ou suspenda o anúncio");
        }
        Imovel imovel = imovel(d.getImovelId());
        boolean revisao = d.julgadaProcedente();
        Instant agora = Instant.now();
        String conclusao = textoValido(form.conclusao());
        d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), conclusao, null, false);
        if (!TextoRico.vazio(form.notaInterna())) {
            d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), textoValido(form.notaInterna()), null, true);
        }
        d.setNatureza(form.natureza());
        d.setMedida(form.medida());
        d.setPenalidade(form.penalidade());
        d.setJulgadoEm(agora);
        d.setApuracaoPrazoEm(null);
        String natureza = form.natureza() == Natureza.MA_FE ? "má-fé" : "informação incorreta";
        String penalidade = switch (form.penalidade()) {
            case NENHUMA -> "";
            case STRIKE -> " Strike registrado na conta do anunciante.";
            case BANIR_CONTA -> " Conta do anunciante banida.";
        };
        String julgada = revisao ? "Julgamento alterado: denúncia procedente (" : "Denúncia julgada procedente (";

        if (form.medida() == MedidaAnuncio.CORRIGIR) {
            int prazo = form.prazoMinutos() != null ? form.prazoMinutos() : regras.config().getAjusteSlaMinutos();
            d.setStatus(StatusDenuncia.AGUARDANDO_ANUNCIANTE);
            d.setEtapa((short) 0);
            d.setConclusao(conclusao);
            prazos.iniciar(d, prazo, agora);
            boolean suspenso = form.suspenderAteCorrigir()
                    && anuncios.aplicarModeracao(imovel.getId(), StatusAnuncio.SUSPENSO);
            d.adicionarMensagem(PapelMensagem.SISTEMA, null, julgada + natureza + "): correção solicitada até "
                    + prazos.formatar(d.getPrazoEm()) + "." + (suspenso ? " Anúncio suspenso até a correção ser aceita." : "")
                    + penalidade, null, false);
            if (suspenso) {
                registrarNasAbertas(imovel.getId(), "Anúncio suspenso até a correção de outra denúncia ser aceita.", d);
            }
            notificarAnunciante(imovel, d, "DENUNCIA_CORRECAO", "Correção solicitada",
                    d.getTipo().getNome() + ". Corrija e responda até " + prazos.formatar(d.getPrazoEm()) + "."
                            + (suspenso ? " O anúncio fica suspenso até a correção ser aceita." : ""),
                    "pi-wrench");
        } else {
            String medida = switch (form.medida()) {
                case MANTER, CORRIGIR -> "anúncio mantido";
                case SUSPENDER -> "anúncio suspenso";
                case BANIR -> "anúncio removido do ar";
            };
            encerrar(d, StatusDenuncia.PROCEDENTE, admin.id(), conclusao, julgada + natureza + "): " + medida + "." + penalidade);
            switch (form.medida()) {
                case MANTER, CORRIGIR -> {
                    if (reativarSePossivel(imovel)) {
                        d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Anúncio de volta ao ar: não restou pendência aberta nele.", null, false);
                    }
                }
                case SUSPENDER -> {
                    if (anuncios.aplicarModeracao(imovel.getId(), StatusAnuncio.SUSPENSO)) {
                        registrarNasAbertas(imovel.getId(), "Anúncio suspenso: outra denúncia deste anúncio foi julgada procedente.", d);
                    }
                }
                case BANIR -> banir(imovel, admin.id(), "Anúncio removido do ar: denúncia \"" + d.getTipo().getNome() + "\" procedente.");
            }
            notificarAnunciante(imovel, d, "DENUNCIA_PROCEDENTE", "Denúncia procedente",
                    d.getTipo().getNome() + ": " + medida + ". " + TextoRico.resumo(conclusao, 200), "pi-exclamation-circle");
            notificarDenunciante(d, imovel, "Sua denúncia foi resolvida", "Obrigado por ajudar a manter os anúncios confiáveis.");
        }

        switch (form.penalidade()) {
            case NENHUMA -> { }
            case STRIKE -> verificarBanimentoDaConta(imovel, d);
            case BANIR_CONTA -> banirConta(imovel, d, "Banimento direto pela moderação: denúncia \""
                    + d.getTipo().getNome() + "\" procedente (" + natureza + ").", false);
        }
        sincronizar(imovel, form.medida() == MedidaAnuncio.BANIR || form.penalidade() == PenalidadeConta.BANIR_CONTA
                ? denuncias.findByImovelIdOrderByCriadoEmAsc(imovel.getId()) : List.of(d));
        return dtoAdmin(d);
    }

    /**
     * Revê um julgamento já encerrado: a denúncia volta para análise, sem julgamento (o strike sai da contagem),
     * e a moderação julga de novo. Opcionalmente reativa a conta e o anúncio.
     */
    @Transactional
    public DenunciaDto reabrir(Long id, ReaberturaForm form, AuthUser admin) {
        Denuncia d = carregar(id);
        if (d.getStatus().aberta()) {
            throw new BusinessException(409, "A denúncia ainda está aberta: julgue de novo pelos botões de julgamento");
        }
        if (denuncias.existsByImovelIdAndDenuncianteIdAndTipoIdAndStatusIn(d.getImovelId(), d.getDenuncianteId(),
                d.getTipo().getId(), ABERTAS)) {
            throw new BusinessException(409, "O denunciante tem outra denúncia deste tipo aberta para este anúncio: continue por ela");
        }
        Imovel imovel = imovel(d.getImovelId());
        d.limparJulgamento();
        d.setStatus(StatusDenuncia.EM_ANALISE);
        d.setEtapa((short) 0);
        prazos.parar(d);
        d.setResolvidoPor(null);
        d.setResolvidoEm(null);
        d.setConclusao(null);
        d.adicionarMensagem(PapelMensagem.ADMIN, admin.id(), textoValido(form.motivo()), null, true);
        d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Julgamento revisto pela moderação: a denúncia voltou para análise.",
                null, false);

        List<Denuncia> alteradas = new ArrayList<>(List.of(d));
        if (form.reativarConta() && contas.reativar(imovel.getAnuncianteId())) {
            d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Conta do anunciante reativada.", null, true);
            // os anúncios que saíram do ar com o banimento da conta voltam, se não tiverem pendência aberta
            for (Imovel outro : imoveis.findByAnuncianteId(imovel.getAnuncianteId())) {
                if (!outro.getId().equals(imovel.getId()) && outro.getStatus() == StatusAnuncio.SUSPENSO
                        && !denuncias.existsByImovelIdAndStatusIn(outro.getId(), ABERTAS)) {
                    anuncios.reativarModeracao(outro.getId());
                }
            }
            notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "CONTA_REATIVADA",
                    "Sua conta foi reativada", "A moderação reviu a decisão que baniu a sua conta.", "pi-check-circle",
                    "/conta", "USUARIO", imovel.getAnuncianteId()));
        }
        if (form.reativarAnuncio() && anuncios.reativarModeracao(imovel.getId())) {
            d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Anúncio de volta ao ar.", null, false);
            imovel = imovel(d.getImovelId());
        }
        notificarAnunciante(imovel, d, "DENUNCIA_REABERTA", "Denúncia reaberta para nova análise",
                d.getTipo().getNome() + ". A moderação reviu o julgamento.", "pi-replay");
        sincronizar(imovel, alteradas);
        return dtoAdmin(d);
    }

    /**
     * Regra da gravidade: com o banimento automático ligado e {@code banirApos} strikes dela na janela de meses,
     * a conta do anunciante é banida e os anúncios dele saem do ar (suspensos).
     */
    private void verificarBanimentoDaConta(Imovel imovel, Denuncia d) {
        Gravidade g = d.getGravidade();
        if (g == null || !g.isBanirContaAuto() || g.getBanirApos() == null) {
            return;
        }
        denuncias.flush();
        long naJanela = contarNaJanela(denuncias.procedentesDoAnunciante(imovel.getAnuncianteId()), g, Instant.now());
        if (naJanela < g.getBanirApos()) {
            return;
        }
        String periodo = g.getJanelaMeses() == null ? "" : " nos últimos " + g.getJanelaMeses() + " meses";
        banirConta(imovel, d, "Banimento automático: " + naJanela + " strikes de gravidade \"" + g.getNome() + "\"" + periodo + ".", true);
    }

    /** Bane a conta do anunciante e tira os anúncios dele do ar (suspensos). */
    private void banirConta(Imovel imovel, Denuncia d, String motivo, boolean automatico) {
        if (!contas.banir(imovel.getAnuncianteId(), motivo)) {
            return;
        }
        d.adicionarMensagem(PapelMensagem.SISTEMA, null, "Conta do anunciante banida. " + motivo, null, true);
        for (Imovel outro : imoveis.findByAnuncianteId(imovel.getAnuncianteId())) {
            if (anuncios.aplicarModeracao(outro.getId(), StatusAnuncio.SUSPENSO)) {
                registrarNasAbertas(outro.getId(), "Anúncio suspenso: a conta do anunciante foi banida.", null);
            }
        }
        notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "CONTA_BANIDA", "Sua conta foi banida",
                motivo, "pi-ban", "/conta", "USUARIO", imovel.getAnuncianteId()));
        if (automatico) {
            notificador.notificarTodos(diretorio.administradores(), new Notificador.Nova(null, "CONTA_BANIDA",
                    "Conta de anunciante banida automaticamente", motivo, "pi-ban", "/admin/denuncias/" + imovel.getId(),
                    "USUARIO", imovel.getAnuncianteId()));
        }
    }

    /** Strikes de uma gravidade dentro da janela de meses dela (sem janela: todos). */
    private static long contarNaJanela(List<Denuncia> procedentes, Gravidade g, Instant agora) {
        Instant desde = g.getJanelaMeses() == null ? null
                : agora.atOffset(ZoneOffset.UTC).minusMonths(g.getJanelaMeses()).toInstant();
        return procedentes.stream().filter(p -> p.getPenalidade() == PenalidadeConta.STRIKE)
                .filter(p -> p.getGravidade() != null && p.getGravidade().getId().equals(g.getId()))
                .filter(p -> desde == null || (p.getJulgadoEm() != null && !p.getJulgadoEm().isBefore(desde))).count();
    }

    /** Alerta a moderação quando o prazo interno de uma apuração vence. */
    @Transactional
    public void avisarApuracaoVencida(Denuncia d) {
        Imovel imovel = imovel(d.getImovelId());
        notificarAdmins(imovel, d, "APURACAO_PRAZO", "Prazo da apuração vencido: " + d.getTipo().getNome(),
                "Anúncio " + imovel.getCodigo() + " - " + imovel.getTitulo(), "pi-clock");
        d.setApuracaoAvisoEnviado(true);
    }

    // ================================================================== automação (chamada pela tarefa agendada)

    /** O prazo da denúncia venceu: aplica a ação da etapa e, se houver, abre o prazo da etapa seguinte. */
    @Transactional
    public void expirar(Denuncia d, ModeracaoConfig cfg, Instant agora) {
        boolean primeira = d.getEtapa() == 0;
        AcaoAutomatica acao = primeira ? cfg.getEtapa1Acao() : cfg.getEtapa2Acao();
        Imovel imovel = imovel(d.getImovelId());
        String rotulo = switch (acao) {
            case NENHUMA -> "nenhuma ação automática";
            case SUSPENDER -> "anúncio suspenso";
            case BANIR -> "anúncio banido";
        };

        if (acao == AcaoAutomatica.BANIR) {
            banir(imovel, null, "Prazo da denúncia \"" + d.getTipo().getNome() + "\" vencido sem resposta: anúncio banido automaticamente.");
            sincronizar(imovel, denuncias.findByImovelIdOrderByCriadoEmAsc(imovel.getId()));
            return;
        }
        boolean suspendeu = acao == AcaoAutomatica.SUSPENDER && anuncios.aplicarModeracao(imovel.getId(), StatusAnuncio.SUSPENSO);

        String texto = "Prazo encerrado sem resposta do anunciante (etapa " + (primeira ? 1 : 2) + "): " + rotulo + ".";
        String aviso;
        if (primeira && cfg.getEtapa2Acao() != AcaoAutomatica.NENHUMA) {
            d.setEtapa((short) 1);
            prazos.iniciar(d, cfg.getEtapa1PrazoMinutos(), agora);
            String seguinte = cfg.getEtapa2Acao() == AcaoAutomatica.BANIR ? "o anúncio será banido" : "o anúncio será suspenso";
            texto += " Novo prazo até " + prazos.formatar(d.getPrazoEm()) + "; sem resposta, " + seguinte + ".";
            aviso = "Responda até " + prazos.formatar(d.getPrazoEm()) + "; depois disso " + seguinte + ".";
        } else {
            d.setEtapa((short) 2);
            prazos.parar(d);
            aviso = "A moderação vai analisar o caso.";
        }
        d.adicionarMensagem(PapelMensagem.SISTEMA, null, texto, null, false);
        notificarAnunciante(imovel, d, "DENUNCIA_VENCIDA",
                suspendeu ? "Prazo vencido: anúncio suspenso" : "Prazo de resposta vencido",
                d.getTipo().getNome() + ". " + aviso, "pi-exclamation-triangle");
        notificarAdmins(imovel, d, "DENUNCIA_VENCIDA", "Prazo vencido: " + d.getTipo().getNome(),
                "Anúncio " + imovel.getCodigo() + " - " + rotulo, "pi-exclamation-triangle");
        sincronizar(imovel, List.of(d));
    }

    /** Aviso de que o prazo está terminando. */
    @Transactional
    public void avisarPrazo(Denuncia d, long minutosRestantes) {
        Imovel imovel = imovel(d.getImovelId());
        notificarAnunciante(imovel, d, "DENUNCIA_PRAZO", "Prazo de resposta terminando",
                d.getTipo().getNome() + ": faltam " + PrazoService.duracao(minutosRestantes) + " (até "
                        + prazos.formatar(d.getPrazoEm()) + ").",
                "pi-clock");
        d.setAvisoEnviado(true);
    }

    // ================================================================== exclusão do anúncio

    /**
     * Anúncio editado: registra o que mudou (campo a campo) em cada denúncia aberta dele, para a moderação conferir
     * a correção sem precisar ver o anúncio (que pode estar suspenso). Com correção solicitada e edição feita pelo
     * anunciante, avisa a moderação.
     */
    @EventListener
    public void aoEditarAnuncio(AnuncioEditadoEvent e) {
        List<Denuncia> abertas = denuncias.findByImovelIdAndStatusIn(e.imovelId(), ABERTAS);
        if (abertas.isEmpty()) {
            return;
        }
        int n = e.alteracoes().size();
        String texto = (e.porAdmin() ? "Anúncio editado pela moderação: " : "Anúncio editado pelo anunciante: ") + n
                + (n == 1 ? " alteração." : " alterações.");
        String detalhes = json.writeValueAsString(e.alteracoes());
        abertas.forEach(d -> d.adicionarMensagem(PapelMensagem.SISTEMA, null, texto, null, false).setAlteracoes(detalhes));
        Imovel imovel = imovel(e.imovelId());
        sincronizar(imovel, abertas);
        if (!e.porAdmin() && abertas.stream().anyMatch(Denuncia::correcaoPendente)) {
            String campos = e.alteracoes().stream().map(AnuncioEditadoEvent.Alteracao::campo).limit(4)
                    .collect(java.util.stream.Collectors.joining(", ")) + (n > 4 ? "…" : "");
            notificador.notificarTodos(diretorio.administradores(), new Notificador.Nova(null, "DENUNCIA_ANUNCIO_EDITADO",
                    "Anúncio com correção pendente foi editado",
                    imovel.getCodigo() + " - " + imovel.getTitulo() + ". Alterado: " + campos + ".",
                    "pi-pencil", "/admin/denuncias/" + e.imovelId(), "IMOVEL", e.imovelId()));
        }
    }

    /** Anúncio sendo excluído: com pendências abertas, impede; sem elas, apaga o histórico de denúncias dele. */
    @EventListener
    public void aoExcluirAnuncio(AnuncioExcluindoEvent e) {
        if (denuncias.existsByImovelIdAndStatusIn(e.imovelId(), ABERTAS)) {
            throw new BusinessException(409, "Este anúncio tem denúncias em aberto e não pode ser excluído agora");
        }
        denuncias.deleteByImovelId(e.imovelId());
    }

    // ================================================================== tempo real

    /** Publica as denúncias alteradas, o anúncio e os contadores (o envio acontece depois do commit). */
    private void sincronizar(Imovel imovel, Collection<Denuncia> alteradas) {
        denuncias.flush();
        Instant agora = Instant.now();
        Set<Long> pessoas = new HashSet<>();
        alteradas.forEach(d -> {
            pessoas.add(d.getDenuncianteId());
            d.getMensagens().stream().map(DenunciaMensagem::getAutorId).filter(Objects::nonNull).forEach(pessoas::add);
        });
        Map<Long, AnuncianteInfo> nomes = pessoas.isEmpty() ? Map.of() : usuarios.buscarTodos(pessoas);
        String sala = salaDoImovel(imovel.getId());
        String admin = canalAdminDoImovel(imovel.getId());
        for (Denuncia d : alteradas) {
            tempoReal.publicar(admin, "denuncia.atualizada", dto(d, agora, true, nomes));
            tempoReal.publicar(sala, "denuncia.atualizada", dto(d, agora, false, nomes));
        }
        ImovelInfo info = info(imovel);
        tempoReal.publicar(admin, "imovel.atualizado", info);
        tempoReal.publicar(sala, "imovel.atualizado", info);
        tempoReal.publicar(CANAL_MODERACAO, "contador", contadorAdmin());
        tempoReal.publicar(TempoReal.canalDoUsuario(imovel.getAnuncianteId()), "pendencias.contador",
                contadorDoAnunciante(imovel.getAnuncianteId()));
    }

    // ================================================================== apoio

    private void banir(Imovel imovel, Long adminId, String registro) {
        anuncios.aplicarModeracao(imovel.getId(), StatusAnuncio.BANIDO);
        List<Denuncia> abertas = denuncias.findByImovelIdAndStatusIn(imovel.getId(), ABERTAS);
        for (Denuncia d : abertas) {
            encerrar(d, StatusDenuncia.ANUNCIO_BANIDO, adminId, null, registro);
            notificarDenunciante(d, imovel, "Sua denúncia foi resolvida",
                    "Obrigado por ajudar a manter os anúncios confiáveis.");
        }
        notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "ANUNCIO_BANIDO", "Seu anúncio foi banido",
                imovel.getCodigo() + " - " + imovel.getTitulo() + ". " + registro, "pi-ban",
                "/conta/pendencias/" + imovel.getId(), "IMOVEL", imovel.getId()));
        if (adminId == null) {
            notificador.notificarTodos(diretorio.administradores(), new Notificador.Nova(null, "ANUNCIO_BANIDO",
                    "Anúncio banido automaticamente", imovel.getCodigo() + " - " + imovel.getTitulo(), "pi-ban",
                    "/admin/denuncias/" + imovel.getId(), "IMOVEL", imovel.getId()));
        }
    }

    private void encerrar(Denuncia d, StatusDenuncia status, Long adminId, String conclusao, String registro) {
        d.setStatus(status);
        prazos.parar(d);
        d.setResolvidoPor(adminId);
        d.setResolvidoEm(Instant.now());
        d.setConclusao(conclusao);
        d.adicionarMensagem(PapelMensagem.SISTEMA, null, registro, null, false);
    }

    /**
     * Se o anúncio está suspenso e não restou pendência aberta nele, volta ao status de antes.
     *
     * @return se o anúncio voltou ao ar
     */
    private boolean reativarSePossivel(Imovel imovel) {
        denuncias.flush();
        if (imovel.getStatus() != StatusAnuncio.SUSPENSO || denuncias.existsByImovelIdAndStatusIn(imovel.getId(), ABERTAS)) {
            return false;
        }
        if (anuncios.reativarModeracao(imovel.getId())) {
            notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "ANUNCIO_REATIVADO",
                    "Seu anúncio voltou a ser exibido", imovel.getCodigo() + " - " + imovel.getTitulo()
                            + ": as pendências foram resolvidas.",
                    "pi-play-circle", "/conta/anuncios", "IMOVEL", imovel.getId()));
            return true;
        }
        return false;
    }

    private void registrarNasAbertas(Long imovelId, String texto) {
        registrarNasAbertas(imovelId, texto, null);
    }

    /** Registra o texto nas denúncias abertas do anúncio, menos em {@code exceto} (que já tem o próprio registro). */
    private void registrarNasAbertas(Long imovelId, String texto, Denuncia exceto) {
        denuncias.findByImovelIdAndStatusIn(imovelId, ABERTAS).stream().filter(d -> d != exceto)
                .forEach(d -> d.adicionarMensagem(PapelMensagem.SISTEMA, null, texto, null, false));
    }

    private void notificarAnunciante(Imovel imovel, Denuncia d, String tipo, String titulo, String mensagem, String icone) {
        notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), tipo, titulo,
                "Anúncio " + imovel.getCodigo() + " - " + mensagem, icone, "/conta/pendencias/" + imovel.getId(),
                "DENUNCIA", d.getId()));
    }

    private void notificarAdmins(Imovel imovel, Denuncia d, String tipo, String titulo, String mensagem, String icone) {
        notificador.notificarTodos(diretorio.administradores(), new Notificador.Nova(null, tipo, titulo, mensagem, icone,
                "/admin/denuncias/" + imovel.getId(), "DENUNCIA", d.getId()));
    }

    private void notificarDenunciante(Denuncia d, Imovel imovel, String titulo, String mensagem) {
        notificador.notificar(new Notificador.Nova(d.getDenuncianteId(), "DENUNCIA_SITUACAO", titulo,
                "Anúncio " + imovel.getCodigo() + " (" + d.getTipo().getNome() + "). " + mensagem, "pi-flag",
                "/conta/denuncias", "DENUNCIA", d.getId()));
    }

    private HistoricoDto historico(Long anuncianteId) {
        Map<StatusDenuncia, Long> m = new LinkedHashMap<>();
        for (Object[] linha : denuncias.historicoDoAnunciante(anuncianteId)) {
            m.put((StatusDenuncia) linha[0], (Long) linha[1]);
        }
        long abertas = ABERTAS.stream().mapToLong(st -> m.getOrDefault(st, 0L)).sum();
        long total = m.values().stream().mapToLong(Long::longValue).sum();
        List<Denuncia> procedentes = denuncias.procedentesDoAnunciante(anuncianteId);
        Instant agora = Instant.now();
        List<ProcedentesPorGravidade> porGravidade = gravidades.findAllByOrderByOrdemAscNomeAsc().stream()
                .map(g -> new ProcedentesPorGravidade(GravidadeResumo.of(g),
                        procedentes.stream().filter(p -> p.getGravidade().getId().equals(g.getId())).count(),
                        contarNaJanela(procedentes, g, agora), g.isBanirContaAuto(), g.getBanirApos(), g.getJanelaMeses()))
                .filter(x -> x.total() > 0 || x.banirContaAuto())
                .toList();
        return new HistoricoDto(total, abertas, m.getOrDefault(StatusDenuncia.RESOLVIDA, 0L),
                m.getOrDefault(StatusDenuncia.IMPROCEDENTE, 0L), procedentes.size(),
                procedentes.stream().filter(p -> p.getNatureza() == Natureza.MA_FE).count(),
                m.getOrDefault(StatusDenuncia.ANUNCIO_BANIDO, 0L), !diretorio.contaAtiva(anuncianteId), porGravidade);
    }

    private List<GrupoDto> grupos(List<Long> imovelIds, Collection<StatusDenuncia> status) {
        if (imovelIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Imovel> mapa = imoveisPorId(imovelIds);
        Map<Long, List<Denuncia>> porImovel = denuncias.findByImovelIdInOrderByCriadoEmAsc(imovelIds).stream()
                .filter(d -> status.contains(d.getStatus()))
                .collect(Collectors.groupingBy(Denuncia::getImovelId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, AnuncianteInfo> nomes = usuarios.buscarTodos(
                mapa.values().stream().map(Imovel::getAnuncianteId).collect(Collectors.toSet()));
        Instant agora = Instant.now();
        List<GrupoDto> r = new ArrayList<>();
        for (Long id : imovelIds) {
            Imovel imovel = mapa.get(id);
            List<Denuncia> lista = ordenar(porImovel.getOrDefault(id, List.of()));
            if (imovel == null || lista.isEmpty()) {
                continue;
            }
            List<DenunciaResumo> resumos = lista.stream().map(d -> new DenunciaResumo(d.getId(), d.getTipo().getNome(),
                    GravidadeResumo.of(d.getGravidade()), d.getStatus(), prazos.dto(d, agora), d.getCriadoEm())).toList();
            Long menor = resumos.stream().map(x -> x.prazo().minutosRestantes()).filter(Objects::nonNull)
                    .min(Comparator.naturalOrder()).orElse(null);
            boolean vencido = resumos.stream().anyMatch(x -> x.prazo().vencido());
            AnuncianteInfo a = nomes.get(imovel.getAnuncianteId());
            r.add(new GrupoDto(info(imovel), imovel.getAnuncianteId(), a == null ? null : a.nome(),
                    lista.stream().filter(d -> d.getStatus().aberta()).count(),
                    lista.stream().filter(d -> d.getStatus() == StatusDenuncia.AGUARDANDO_ANUNCIANTE).count(),
                    lista.stream().filter(d -> d.getStatus() == StatusDenuncia.EM_ANALISE).count(),
                    lista.stream().filter(d -> d.getStatus() == StatusDenuncia.EM_APURACAO).count(), menor, vencido,
                    lista.stream().map(Denuncia::getCriadoEm).max(Comparator.naturalOrder()).orElse(null), resumos));
        }
        return r;
    }

    /** Abertas primeiro (aguardando o anunciante, depois em análise), depois as encerradas; dentro, por data. */
    private static List<Denuncia> ordenar(List<Denuncia> lista) {
        return lista.stream().sorted(Comparator.comparingInt((Denuncia d) -> d.getStatus().ordinal())
                .thenComparing(Denuncia::getCriadoEm)).toList();
    }

    private DenunciaDto dtoAdmin(Denuncia d) {
        Set<Long> pessoas = Stream.concat(Stream.of(d.getDenuncianteId()),
                d.getMensagens().stream().map(DenunciaMensagem::getAutorId).filter(Objects::nonNull)).collect(Collectors.toSet());
        return dto(d, Instant.now(), true, usuarios.buscarTodos(pessoas));
    }

    /**
     * @param admin visão da administração (com denunciante e notas internas); senão, visão do anunciante
     */
    private DenunciaDto dto(Denuncia d, Instant agora, boolean admin, Map<Long, AnuncianteInfo> nomes) {
        AnuncianteInfo den = admin ? nomes.get(d.getDenuncianteId()) : null;
        List<MensagemDto> msgs = d.getMensagens().stream().filter(m -> admin || !m.isInterna())
                .map(m -> new MensagemDto(m.getId(), m.getPapel(), autor(m, admin, nomes), foto(m, admin, nomes),
                        m.getTexto(), separarAnexos(m.getAnexos()), m.isInterna(), m.getCriadoEm(),
                        lerAlteracoes(m.getAlteracoes())))
                .toList();
        PrazoDto prazo = prazos.dto(d, agora);
        return new DenunciaDto(d.getId(), TipoPublicoDto.of(d.getTipo()), GravidadeResumo.of(d.getGravidade()),
                d.getDescricao(), d.getStatus(), prazo, den == null ? null : den.nome(), den == null ? null : den.email(),
                d.getCriadoEm(), d.getResolvidoEm(), d.getConclusao(), d.getNatureza(), d.getMedida(),
                admin ? d.getPenalidade() : null, d.getJulgadoEm(), admin ? d.getApuracaoPrazoEm() : null, msgs);
    }

    private static String autor(DenunciaMensagem m, boolean admin, Map<Long, AnuncianteInfo> nomes) {
        return switch (m.getPapel()) {
            case SISTEMA -> "Sistema";
            case ADMIN -> admin && nomes.containsKey(m.getAutorId()) ? nomes.get(m.getAutorId()).nome() : "Moderação";
            case ANUNCIANTE -> nomes.containsKey(m.getAutorId()) ? nomes.get(m.getAutorId()).nome() : "Anunciante";
        };
    }

    /** Foto de perfil do autor; o administrador só aparece com foto na visão da administração. */
    private static String foto(DenunciaMensagem m, boolean admin, Map<Long, AnuncianteInfo> nomes) {
        if (m.getPapel() == PapelMensagem.SISTEMA || (m.getPapel() == PapelMensagem.ADMIN && !admin)) {
            return null;
        }
        AnuncianteInfo a = nomes.get(m.getAutorId());
        return a == null ? null : a.fotoUrl();
    }

    /** Máximo de caracteres de texto (sem contar as marcações do editor). */
    private static final int MAX_TEXTO = 5000;

    /** HTML do editor limpo (lista de tags permitidas), não vazio e dentro do limite de caracteres. */
    private static String textoValido(String entrada) {
        String html = TextoRico.limpar(entrada);
        if (TextoRico.vazio(html)) {
            throw new BusinessException("Escreva a mensagem");
        }
        if (TextoRico.texto(html).length() > MAX_TEXTO) {
            throw new BusinessException("A mensagem pode ter no máximo " + MAX_TEXTO + " caracteres");
        }
        return html;
    }

    private List<AnuncioEditadoEvent.Alteracao> lerAlteracoes(String texto) {
        if (texto == null || texto.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(texto, new TypeReference<List<AnuncioEditadoEvent.Alteracao>>() { });
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private static List<String> separarAnexos(String anexos) {
        return anexos == null || anexos.isBlank() ? List.of() : Arrays.stream(anexos.split("\n")).filter(s -> !s.isBlank()).toList();
    }

    private Denuncia carregar(Long id) {
        return denuncias.findById(id).orElseThrow(() -> new NotFoundException("Denúncia não encontrada"));
    }

    private Imovel imovel(Long id) {
        return imoveis.findById(id).orElseThrow(() -> new NotFoundException("Anúncio não encontrado"));
    }

    private Map<Long, Imovel> imoveisPorId(Collection<Long> ids) {
        return imoveis.findAllById(new HashSet<>(ids)).stream().collect(Collectors.toMap(Imovel::getId, Function.identity()));
    }

    private static ImovelInfo info(Imovel i) {
        if (i == null) {
            return null;
        }
        String capa = i.getFotos().isEmpty() ? null : i.getFotos().get(0).getUrl();
        return new ImovelInfo(i.getId(), i.getCodigo(), i.getTitulo(), i.getStatus(), capa, i.getCidade(), i.getBairro());
    }
}
