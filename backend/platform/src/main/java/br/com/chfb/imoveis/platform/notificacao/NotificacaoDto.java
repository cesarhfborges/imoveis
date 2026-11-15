package br.com.chfb.imoveis.platform.notificacao;

import java.time.Instant;

public record NotificacaoDto(Long id, String tipo, String titulo, String mensagem, String icone, String link,
        boolean lida, Instant criadoEm) {

    static NotificacaoDto of(Notificacao n) {
        return new NotificacaoDto(n.getId(), n.getTipo(), n.getTitulo(), n.getMensagem(), n.getIcone(), n.getLink(),
                n.getLidaEm() != null, n.getCriadoEm());
    }
}
