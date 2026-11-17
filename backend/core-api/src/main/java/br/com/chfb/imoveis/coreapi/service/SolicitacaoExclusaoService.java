package br.com.chfb.imoveis.coreapi.service;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ExclusaoContaStatus;
import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import br.com.chfb.imoveis.coreapi.entity.SolicitacaoExclusao;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.SolicitacaoExclusaoRepository;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.listing.service.PainelService;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/**
 * "Remover conta" em Meus dados: o próprio usuário (cliente, corretor ou imobiliária) pede a remoção definitiva.
 * A conta continua funcionando durante o prazo de espera (configurável na aba Regras); a tarefa das 03:00 apaga as
 * contas vencidas com {@link ExclusaoContaService}. Até lá o usuário pode desistir.
 */
@Service
public class SolicitacaoExclusaoService {

    private static final Logger log = LoggerFactory.getLogger(SolicitacaoExclusaoService.class);

    /** Horário da tarefa que apaga as contas (o mesmo do cron em {@code ExclusaoContaAgendamento}). */
    static final LocalTime HORA_DA_REMOCAO = LocalTime.of(3, 0);
    private static final ZoneId FUSO = PainelService.FUSO;
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm").withZone(FUSO);

    private final SolicitacaoExclusaoRepository solicitacoes;
    private final UsuarioRepository usuarios;
    private final ConfiguracaoService configuracao;
    private final PasswordEncoder encoder;
    private final Notificador notificador;
    private final ExclusaoContaService exclusao;

    public SolicitacaoExclusaoService(SolicitacaoExclusaoRepository solicitacoes, UsuarioRepository usuarios,
            ConfiguracaoService configuracao, PasswordEncoder encoder, Notificador notificador,
            ExclusaoContaService exclusao) {
        this.solicitacoes = solicitacoes;
        this.usuarios = usuarios;
        this.configuracao = configuracao;
        this.encoder = encoder;
        this.notificador = notificador;
        this.exclusao = exclusao;
    }

    /**
     * Quando a conta será apagada: a primeira execução da tarefa (03:00) depois de cumpridos os dias de espera.
     * Ex.: pedido em 17/11 às 14h com 1 dia de espera → 19/11 às 03:00.
     */
    static Instant dataDaRemocao(Instant pedido, int diasDeEspera) {
        ZonedDateTime minimo = pedido.atZone(FUSO).plusDays(diasDeEspera);
        ZonedDateTime remocao = minimo.toLocalDate().atTime(HORA_DA_REMOCAO).atZone(FUSO);
        return (remocao.isBefore(minimo) ? remocao.plusDays(1) : remocao).toInstant();
    }

    @Transactional(readOnly = true)
    public ExclusaoContaStatus status(AuthUser auth) {
        Usuario u = usuario(auth);
        return status(u, solicitacoes.findByUsuarioIdAndCanceladaEmIsNullAndExecutadaEmIsNull(u.getId()).orElse(null));
    }

    @Transactional
    public ExclusaoContaStatus solicitar(AuthUser auth, String senha) {
        Usuario u = usuario(auth);
        Configuracao c = configuracao.atual();
        var pendente = solicitacoes.findByUsuarioIdAndCanceladaEmIsNullAndExecutadaEmIsNull(u.getId());
        if (pendente.isPresent()) {
            return status(u, pendente.get());
        }
        if (!c.isAutoExclusaoConta()) {
            throw new ForbiddenException("A remoção de conta pelo site está desligada. Fale com o suporte do site.");
        }
        if (u.getPapeis().contains(Perfil.ADMIN)) {
            throw new BusinessException("Contas de administrador não podem ser removidas por aqui. Peça a outro administrador.");
        }
        if (senha == null || !encoder.matches(senha, u.getSenhaHash())) {
            throw new BusinessException("Senha incorreta");
        }
        SolicitacaoExclusao s = solicitacoes.save(new SolicitacaoExclusao(u.getId(),
                dataDaRemocao(Instant.now(), c.getDiasEsperaExclusao())));
        notificador.notificar(new Notificador.Nova(u.getId(), "CONTA_REMOCAO", "Remoção da conta agendada",
                "Sua conta e seus dados serão apagados em " + DATA.format(s.getRemoverEm())
                        + ". Até lá você pode desistir em Meus dados.",
                "pi-trash", "/conta/perfil", "EXCLUSAO_CONTA", s.getId()));
        log.info("Usuário {} pediu a remoção da conta (agendada para {})", u.getId(), s.getRemoverEm());
        return status(u, s);
    }

    /** Desistir: o pedido é cancelado (exclusão lógica) e a conta continua normalmente. */
    @Transactional
    public ExclusaoContaStatus desistir(AuthUser auth) {
        Usuario u = usuario(auth);
        SolicitacaoExclusao s = solicitacoes.findByUsuarioIdAndCanceladaEmIsNullAndExecutadaEmIsNull(u.getId())
                .orElseThrow(() -> new NotFoundException("Não há pedido de remoção da conta em andamento"));
        s.setCanceladaEm(Instant.now());
        notificador.notificar(new Notificador.Nova(u.getId(), "CONTA_REMOCAO", "Remoção da conta cancelada",
                "Você desistiu de remover a conta. Nada foi apagado.", "pi-check-circle", "/conta/perfil",
                "EXCLUSAO_CONTA", s.getId()));
        log.info("Usuário {} desistiu da remoção da conta", u.getId());
        return status(u, null);
    }

    /**
     * Tarefa das 03:00: apaga as contas com prazo vencido. Cada conta numa transação própria, para uma falha não
     * travar as outras (a que falhar fica pendente e é tentada de novo no dia seguinte).
     *
     * @return quantas contas foram apagadas
     */
    public int executarVencidas() {
        List<SolicitacaoExclusao> vencidas = solicitacoes
                .findByRemoverEmLessThanEqualAndCanceladaEmIsNullAndExecutadaEmIsNullOrderByRemoverEm(Instant.now());
        int apagadas = 0;
        for (SolicitacaoExclusao s : vencidas) {
            try {
                if (exclusao.excluirAPedido(s.getUsuarioId())) {
                    apagadas++;
                } else {
                    // a conta já tinha sido apagada pelo administrador: só encerra o pedido
                    s.setExecutadaEm(Instant.now());
                    solicitacoes.save(s);
                }
            } catch (RuntimeException e) {
                log.warn("Falha ao remover a conta {} (pedido {}); nova tentativa na próxima execução: {}",
                        s.getUsuarioId(), s.getId(), e.getMessage());
            }
        }
        if (!vencidas.isEmpty()) {
            log.info("Remoção de contas: {} de {} pedidos vencidos atendidos", apagadas, vencidas.size());
        }
        return apagadas;
    }

    private ExclusaoContaStatus status(Usuario u, SolicitacaoExclusao s) {
        Configuracao c = configuracao.atual();
        boolean admin = u.getPapeis().contains(Perfil.ADMIN);
        return new ExclusaoContaStatus(c.isAutoExclusaoConta() && !admin, c.getDiasEsperaExclusao(),
                dataDaRemocao(Instant.now(), c.getDiasEsperaExclusao()),
                s == null ? null : s.getCriadoEm(), s == null ? null : s.getRemoverEm());
    }

    private Usuario usuario(AuthUser auth) {
        return usuarios.findById(auth.id()).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
    }
}
