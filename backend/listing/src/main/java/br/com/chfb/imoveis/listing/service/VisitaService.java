package br.com.chfb.imoveis.listing.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.VisitaDtos.DiaHorarios;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.Pessoa;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.PropostaForm;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.RecadoForm;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.VisitaDto;
import br.com.chfb.imoveis.listing.dto.VisitaDtos.VisitaForm;
import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.StatusVisita;
import br.com.chfb.imoveis.listing.entity.Visita;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.listing.repository.VisitaRepository;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider.AnuncianteInfo;
import br.com.chfb.imoveis.sharedkernel.port.HorarioComercial;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Agendamento de visitas: o cliente pede um horário livre (dentro do expediente do calendário do site), o anunciante
 * confirma, recusa ou propõe outro, e qualquer um dos dois pode cancelar. Cada passo avisa o outro lado.
 */
@Service
public class VisitaService {

    /** Duração de cada visita (e tamanho do bloco de horários oferecidos). */
    static final Duration DURACAO = Duration.ofHours(1);
    /** Antecedência mínima para pedir um horário. */
    static final Duration ANTECEDENCIA = Duration.ofHours(2);
    /** Quantos dias à frente o cliente pode escolher. */
    static final int DIAS = 14;

    private static final Set<StatusVisita> ANDAMENTO = EnumSet.of(StatusVisita.SOLICITADA, StatusVisita.CONFIRMADA,
            StatusVisita.NOVO_HORARIO);

    private final VisitaRepository visitas;
    private final ImovelRepository imoveis;
    private final HorarioComercial horario;
    private final Notificador notificador;
    private final AnuncianteProvider pessoas;
    private final RecursosSitePolicy recursos;

    public VisitaService(VisitaRepository visitas, ImovelRepository imoveis, HorarioComercial horario,
            Notificador notificador, AnuncianteProvider pessoas, RecursosSitePolicy recursos) {
        this.visitas = visitas;
        this.imoveis = imoveis;
        this.horario = horario;
        this.notificador = notificador;
        this.pessoas = pessoas;
        this.recursos = recursos;
    }

    // ------------------------------------------------------------------ horários

    /** Horários livres do imóvel nos próximos {@link #DIAS} dias (só dias com algum horário). */
    @Transactional(readOnly = true)
    public List<DiaHorarios> horarios(Long imovelId) {
        exigirLigado();
        Imovel imovel = anuncioNoAr(imovelId);
        ZoneId fuso = horario.fuso();
        Instant agora = Instant.now();
        LocalDate hoje = LocalDate.now(fuso);
        Instant ate = hoje.plusDays(DIAS + 1L).atStartOfDay(fuso).toInstant();
        Set<Instant> ocupados = new HashSet<>(visitas.ocupados(imovel.getId(), imovel.getAnuncianteId(), agora, ate, ANDAMENTO));
        List<DiaHorarios> dias = new ArrayList<>();
        for (int d = 0; d <= DIAS; d++) {
            LocalDate dia = hoje.plusDays(d);
            List<Instant> livres = new ArrayList<>();
            for (int hora = 0; hora < 24; hora++) {
                Instant inicio = dia.atTime(hora, 0).atZone(fuso).toInstant();
                if (livre(inicio, agora, ocupados)) {
                    livres.add(inicio);
                }
            }
            if (!livres.isEmpty()) {
                dias.add(new DiaHorarios(dia, livres));
            }
        }
        return dias;
    }

    private boolean livre(Instant inicio, Instant agora, Set<Instant> ocupados) {
        return !inicio.isBefore(agora.plus(ANTECEDENCIA)) && !ocupados.contains(inicio)
                && horario.dentroDoExpediente(inicio, inicio.plus(DURACAO));
    }

    // ------------------------------------------------------------------ cliente

    @Transactional(readOnly = true)
    public List<VisitaDto> doCliente(AuthUser u) {
        List<Visita> lista = visitas.findByClienteIdOrderByInicioDesc(u.id());
        Map<Long, AnuncianteInfo> nomes = pessoas.buscarTodos(lista.stream().map(v -> v.getImovel().getAnuncianteId()).toList());
        return lista.stream().map(v -> dto(v, nomes.get(v.getImovel().getAnuncianteId()))).toList();
    }

    @Transactional
    public VisitaDto pedir(VisitaForm form, AuthUser u) {
        exigirLigado();
        Imovel imovel = anuncioNoAr(form.imovelId());
        if (Objects.equals(imovel.getAnuncianteId(), u.id())) {
            throw new BusinessException("Você não pode agendar visita no seu próprio anúncio");
        }
        if (visitas.existsByImovelIdAndClienteIdAndStatusIn(imovel.getId(), u.id(), ANDAMENTO)) {
            throw new BusinessException(409, "Você já tem uma visita em andamento para este imóvel. Veja em Minhas visitas.");
        }
        exigirHorarioLivre(imovel, form.inicio());
        Visita v = new Visita();
        v.setImovel(imovel);
        v.setClienteId(u.id());
        v.setInicio(form.inicio());
        v.setFim(form.inicio().plus(DURACAO));
        v.setMensagem(texto(form.mensagem()));
        Visita salva = salvar(v);
        avisar(imovel.getAnuncianteId(), "VISITA_PEDIDA", "Pedido de visita: " + imovel.getCodigo(),
                quando(salva.getInicio()) + " · " + imovel.getTitulo(), "pi-calendar-plus", "/conta/visitas", salva);
        return dto(salva, pessoa(imovel.getAnuncianteId()));
    }

    /** Aceita o horário proposto pelo anunciante. */
    @Transactional
    public VisitaDto aceitarProposta(Long id, AuthUser u) {
        Visita v = doCliente(id, u);
        if (v.getStatus() != StatusVisita.NOVO_HORARIO || v.getPropostoInicio() == null) {
            throw new BusinessException(409, "Não há novo horário para aceitar");
        }
        v.setInicio(v.getPropostoInicio());
        v.setFim(v.getPropostoInicio().plus(DURACAO));
        v.setPropostoInicio(null);
        v.setStatus(StatusVisita.CONFIRMADA);
        avisar(v.getImovel().getAnuncianteId(), "VISITA_CONFIRMADA", "Visita confirmada: " + v.getImovel().getCodigo(),
                "O cliente aceitou o novo horário: " + quando(v.getInicio()), "pi-calendar", "/conta/visitas", v);
        return dto(v, pessoa(v.getImovel().getAnuncianteId()));
    }

    @Transactional
    public VisitaDto cancelarPeloCliente(Long id, RecadoForm form, AuthUser u) {
        Visita v = doCliente(id, u);
        exigirAndamento(v);
        v.setStatus(StatusVisita.CANCELADA);
        String motivo = texto(form == null ? null : form.mensagem());
        avisar(v.getImovel().getAnuncianteId(), "VISITA_CANCELADA", "Visita cancelada pelo cliente: " + v.getImovel().getCodigo(),
                quando(v.getInicio()) + (motivo == null ? "" : " · " + motivo), "pi-calendar-times", "/conta/visitas", v);
        return dto(v, pessoa(v.getImovel().getAnuncianteId()));
    }

    // ------------------------------------------------------------------ anunciante

    @Transactional(readOnly = true)
    public List<VisitaDto> doAnunciante(AuthUser u) {
        List<Visita> lista = visitas.findByImovelAnuncianteIdOrderByInicioDesc(u.id());
        Map<Long, AnuncianteInfo> nomes = pessoas.buscarTodos(lista.stream().map(Visita::getClienteId).toList());
        return lista.stream().map(v -> dto(v, nomes.get(v.getClienteId()))).toList();
    }

    @Transactional
    public VisitaDto confirmar(Long id, AuthUser u) {
        Visita v = doAnunciante(id, u);
        if (v.getStatus() != StatusVisita.SOLICITADA) {
            throw new BusinessException(409, "Só um pedido aguardando resposta pode ser confirmado");
        }
        v.setStatus(StatusVisita.CONFIRMADA);
        avisar(v.getClienteId(), "VISITA_CONFIRMADA", "Visita confirmada",
                quando(v.getInicio()) + " · " + v.getImovel().getTitulo(), "pi-calendar", "/conta/visitas", v);
        return dto(v, pessoa(v.getClienteId()));
    }

    @Transactional
    public VisitaDto recusar(Long id, RecadoForm form, AuthUser u) {
        Visita v = doAnunciante(id, u);
        if (v.getStatus() != StatusVisita.SOLICITADA) {
            throw new BusinessException(409, "Só um pedido aguardando resposta pode ser recusado");
        }
        v.setStatus(StatusVisita.RECUSADA);
        v.setResposta(texto(form == null ? null : form.mensagem()));
        avisar(v.getClienteId(), "VISITA_RECUSADA", "Pedido de visita recusado",
                v.getImovel().getTitulo() + (v.getResposta() == null ? "" : " · " + v.getResposta()), "pi-calendar-times",
                "/conta/visitas", v);
        return dto(v, pessoa(v.getClienteId()));
    }

    /** Propõe outro horário (também livre e no expediente); o cliente aceita ou cancela. */
    @Transactional
    public VisitaDto propor(Long id, PropostaForm form, AuthUser u) {
        Visita v = doAnunciante(id, u);
        if (v.getStatus() != StatusVisita.SOLICITADA && v.getStatus() != StatusVisita.CONFIRMADA) {
            throw new BusinessException(409, "Esta visita não aceita outro horário");
        }
        if (form.inicio().equals(v.getInicio())) {
            throw new BusinessException("Escolha um horário diferente do atual");
        }
        exigirHorarioLivre(v.getImovel(), form.inicio());
        v.setPropostoInicio(form.inicio());
        v.setResposta(texto(form.mensagem()));
        v.setStatus(StatusVisita.NOVO_HORARIO);
        avisar(v.getClienteId(), "VISITA_NOVO_HORARIO", "Novo horário proposto para a visita",
                quando(form.inicio()) + " · " + v.getImovel().getTitulo(), "pi-calendar-clock", "/conta/visitas", v);
        return dto(v, pessoa(v.getClienteId()));
    }

    @Transactional
    public VisitaDto cancelarPeloAnunciante(Long id, RecadoForm form, AuthUser u) {
        Visita v = doAnunciante(id, u);
        exigirAndamento(v);
        v.setStatus(StatusVisita.CANCELADA);
        v.setResposta(texto(form == null ? null : form.mensagem()));
        avisar(v.getClienteId(), "VISITA_CANCELADA", "Visita cancelada pelo anunciante",
                quando(v.getInicio()) + " · " + v.getImovel().getTitulo() + (v.getResposta() == null ? "" : " · " + v.getResposta()),
                "pi-calendar-times", "/conta/visitas", v);
        return dto(v, pessoa(v.getClienteId()));
    }

    // ------------------------------------------------------------------ apoio

    private void exigirLigado() {
        if (!recursos.agendamentoVisita()) {
            throw new ForbiddenException("O agendamento de visitas está desativado no momento");
        }
    }

    private Imovel anuncioNoAr(Long id) {
        return imoveis.findById(id).filter(i -> i.getStatus() == StatusAnuncio.ATIVO)
                .orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
    }

    private void exigirHorarioLivre(Imovel imovel, Instant inicio) {
        Instant agora = Instant.now();
        Set<Instant> ocupados = new HashSet<>(visitas.ocupados(imovel.getId(), imovel.getAnuncianteId(), inicio,
                inicio.plusSeconds(1), ANDAMENTO));
        if (inicio.getEpochSecond() % 3600 != 0 || !livre(inicio, agora, ocupados)) {
            throw new BusinessException(409, "Este horário não está mais disponível. Escolha outro.");
        }
    }

    private static void exigirAndamento(Visita v) {
        if (!v.getStatus().emAndamento()) {
            throw new BusinessException(409, "Esta visita já foi encerrada");
        }
    }

    private Visita doCliente(Long id, AuthUser u) {
        Visita v = visitas.findById(id).orElseThrow(() -> new NotFoundException("Visita não encontrada"));
        if (!Objects.equals(v.getClienteId(), u.id())) {
            throw new ForbiddenException("Visita de outro usuário");
        }
        return v;
    }

    private Visita doAnunciante(Long id, AuthUser u) {
        Visita v = visitas.findById(id).orElseThrow(() -> new NotFoundException("Visita não encontrada"));
        if (!Objects.equals(v.getImovel().getAnuncianteId(), u.id())) {
            throw new ForbiddenException("Visita a anúncio de outro anunciante");
        }
        return v;
    }

    /** O índice único do banco segura dois pedidos no mesmo horário ao mesmo tempo. */
    private Visita salvar(Visita v) {
        try {
            return visitas.saveAndFlush(v);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(409, "Este horário acabou de ser reservado. Escolha outro.");
        }
    }

    private void avisar(Long para, String tipo, String titulo, String mensagem, String icone, String link, Visita v) {
        notificador.notificar(new Notificador.Nova(para, tipo, titulo, mensagem, icone, link, "VISITA", v.getId()));
    }

    private String quando(Instant i) {
        return DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm").withZone(horario.fuso()).format(i);
    }

    private static String texto(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private AnuncianteInfo pessoa(Long id) {
        return pessoas.buscarTodos(List.of(id)).get(id);
    }

    private static VisitaDto dto(Visita v, AnuncianteInfo p) {
        Imovel i = v.getImovel();
        String foto = i.getFotos().stream().findFirst().map(FotoImovel::getUrl).orElse(null);
        return new VisitaDto(v.getId(), i.getId(), i.getCodigo(), i.getTitulo(), i.getBairro(), i.getCidade(), foto,
                v.getInicio(), v.getFim(), v.getStatus(), v.getMensagem(), v.getResposta(), v.getPropostoInicio(),
                p == null ? null : new Pessoa(p.id(), p.nome(), p.email(), p.telefone()), v.getCriadoEm());
    }
}
