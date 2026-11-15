package br.com.chfb.imoveis.moderation.service;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import br.com.chfb.imoveis.moderation.entity.Denuncia;
import br.com.chfb.imoveis.moderation.entity.ModeracaoConfig;
import br.com.chfb.imoveis.moderation.entity.StatusDenuncia;
import br.com.chfb.imoveis.moderation.repository.DenunciaRepository;

/**
 * Passada da automação (chamada a cada minuto): atualiza os minutos restantes de cada prazo, avisa quando
 * está terminando e, ao vencer, executa a ação configurada da etapa. Cada denúncia roda na própria transação
 * e é travada com SKIP LOCKED, então duas instâncias do sistema não processam a mesma denúncia.
 */
@Service
public class AutomacaoService {

    private static final Logger log = LoggerFactory.getLogger(AutomacaoService.class);

    private final DenunciaRepository denuncias;
    private final DenunciaService fluxo;
    private final PrazoService prazos;
    private final RegrasService regras;
    private final TransactionTemplate tx;

    public AutomacaoService(DenunciaRepository denuncias, DenunciaService fluxo, PrazoService prazos,
            RegrasService regras, PlatformTransactionManager transacoes) {
        this.denuncias = denuncias;
        this.fluxo = fluxo;
        this.prazos = prazos;
        this.regras = regras;
        this.tx = new TransactionTemplate(transacoes);
    }

    /** @return quantas denúncias tiveram uma ação automática executada */
    public int processar() {
        Instant agora = Instant.now();
        List<Long> ids = denuncias.comPrazo(StatusDenuncia.AGUARDANDO_ANUNCIANTE);
        int acoes = 0;
        for (Long id : ids) {
            try {
                Boolean executou = tx.execute(s -> processarUma(id, agora));
                if (Boolean.TRUE.equals(executou)) {
                    acoes++;
                }
            } catch (RuntimeException e) {
                log.warn("Falha ao processar o prazo da denúncia {}", id, e);
            }
        }
        if (acoes > 0) {
            log.info("Moderação: {} prazo(s) vencido(s) processado(s)", acoes);
        }
        // apurações com prazo interno vencido: só alertam a moderação (uma vez)
        for (Long id : denuncias.apuracoesComPrazo(StatusDenuncia.EM_APURACAO)) {
            try {
                tx.executeWithoutResult(s -> denuncias.travar(id)
                        .filter(d -> d.getStatus() == StatusDenuncia.EM_APURACAO && d.getApuracaoPrazoEm() != null
                                && !d.isApuracaoAvisoEnviado() && !agora.isBefore(d.getApuracaoPrazoEm()))
                        .ifPresent(fluxo::avisarApuracaoVencida));
            } catch (RuntimeException e) {
                log.warn("Falha ao avisar a apuração da denúncia {}", id, e);
            }
        }
        return acoes;
    }

    private boolean processarUma(Long id, Instant agora) {
        Denuncia d = denuncias.travar(id).orElse(null);
        if (d == null || d.getStatus() != StatusDenuncia.AGUARDANDO_ANUNCIANTE || d.getPrazoEm() == null) {
            return false;
        }
        long restantes = prazos.minutosRestantes(d, agora);
        d.setMinutosRestantes((int) Math.min(restantes, Integer.MAX_VALUE));
        ModeracaoConfig cfg = regras.config();
        if (agora.isBefore(d.getPrazoEm())) {
            if (cfg.getAvisoMinutos() > 0 && !d.isAvisoEnviado() && restantes <= cfg.getAvisoMinutos()) {
                fluxo.avisarPrazo(d, restantes);
            }
            return false;
        }
        if (!cfg.isAutomacaoAtiva()) {
            // automação desligada: o prazo fica vencido e a decisão é da administração
            return false;
        }
        fluxo.expirar(d, cfg, agora);
        return true;
    }
}
