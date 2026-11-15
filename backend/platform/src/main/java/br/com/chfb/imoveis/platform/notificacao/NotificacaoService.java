package br.com.chfb.imoveis.platform.notificacao;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.port.TempoReal;

/**
 * Notificações dos usuários. Os outros módulos criam avisos pela porta {@link Notificador}; o usuário lista,
 * abre (marca como lida), marca todas como lidas e apaga. Nada disso altera o registro de origem.
 * <p>
 * Tempo real, no canal privado do usuário ({@code private-usuario.{id}}):
 * {@code notificacao.nova} (a notificação + o total de não lidas) e {@code notificacao.contador} (só o total,
 * quando algo é lido ou apagado, para as outras abas acompanharem).
 */
@Service
public class NotificacaoService implements Notificador {

    private final NotificacaoRepository repo;
    private final TempoReal tempoReal;

    public NotificacaoService(NotificacaoRepository repo, TempoReal tempoReal) {
        this.repo = repo;
        this.tempoReal = tempoReal;
    }

    /** Evento de nova notificação. */
    public record NovaEvento(NotificacaoDto notificacao, long naoLidas) {
    }

    private void publicarContador(Long usuarioId) {
        repo.flush();
        tempoReal.publicar(TempoReal.canalDoUsuario(usuarioId), "notificacao.contador", Map.of("naoLidas", naoLidas(usuarioId)));
    }

    /** Entra na transação de quem notifica: se a operação de origem falhar, o aviso também não fica. */
    @Override
    @Transactional
    public void notificar(Nova n) {
        if (n.usuarioId() == null) {
            return;
        }
        Notificacao x = new Notificacao();
        x.setUsuarioId(n.usuarioId());
        x.setTipo(n.tipo());
        x.setTitulo(cortar(n.titulo(), 160));
        x.setMensagem(cortar(n.mensagem(), 500));
        x.setIcone(n.icone());
        x.setLink(n.link());
        x.setOrigemTipo(n.origemTipo());
        x.setOrigemId(n.origemId());
        repo.saveAndFlush(x);
        tempoReal.publicar(TempoReal.canalDoUsuario(n.usuarioId()), "notificacao.nova",
                new NovaEvento(NotificacaoDto.of(x), repo.countByUsuarioIdAndLidaEmIsNull(n.usuarioId())));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificacaoDto> listar(Long usuarioId, boolean somenteNaoLidas, int page, int size) {
        PageRequest p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        return PageResponse.of(somenteNaoLidas ? repo.findByUsuarioIdAndLidaEmIsNullOrderByCriadoEmDesc(usuarioId, p)
                : repo.findByUsuarioIdOrderByCriadoEmDesc(usuarioId, p), NotificacaoDto::of);
    }

    @Transactional(readOnly = true)
    public long naoLidas(Long usuarioId) {
        return repo.countByUsuarioIdAndLidaEmIsNull(usuarioId);
    }

    /** Abrir = marcar como lida; devolve a notificação (com o link para navegar). */
    @Transactional
    public NotificacaoDto abrir(Long id, Long usuarioId) {
        Notificacao n = carregar(id, usuarioId);
        if (n.getLidaEm() == null) {
            n.setLidaEm(Instant.now());
            publicarContador(usuarioId);
        }
        return NotificacaoDto.of(n);
    }

    @Transactional
    public NotificacaoDto marcar(Long id, Long usuarioId, boolean lida) {
        Notificacao n = carregar(id, usuarioId);
        n.setLidaEm(lida ? (n.getLidaEm() == null ? Instant.now() : n.getLidaEm()) : null);
        publicarContador(usuarioId);
        return NotificacaoDto.of(n);
    }

    @Transactional
    public int marcarTodasLidas(Long usuarioId) {
        int n = repo.marcarTodasLidas(usuarioId, Instant.now());
        publicarContador(usuarioId);
        return n;
    }

    @Transactional
    public void apagar(Long id, Long usuarioId) {
        repo.delete(carregar(id, usuarioId));
        publicarContador(usuarioId);
    }

    @Transactional
    public int apagarLidas(Long usuarioId) {
        int n = repo.apagarLidas(usuarioId);
        publicarContador(usuarioId);
        return n;
    }

    private Notificacao carregar(Long id, Long usuarioId) {
        return repo.findByIdAndUsuarioId(id, usuarioId).orElseThrow(() -> new NotFoundException("Notificação não encontrada"));
    }

    private static String cortar(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
