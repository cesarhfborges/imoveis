package br.com.chfb.imoveis.moderation.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import br.com.chfb.imoveis.moderation.service.AutomacaoService;

/**
 * Tarefa agendada da moderação: a cada minuto (configurável em app.moderacao.intervalo-ms) atualiza os prazos
 * e executa as automações. Pode ser desligada com app.moderacao.agendador=false.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.moderacao.agendador", havingValue = "true", matchIfMissing = true)
public class ModeracaoAgendamento {

    private final AutomacaoService automacao;

    public ModeracaoAgendamento(AutomacaoService automacao) {
        this.automacao = automacao;
    }

    @Scheduled(fixedDelayString = "${app.moderacao.intervalo-ms:60000}", initialDelayString = "${app.moderacao.atraso-inicial-ms:15000}")
    public void rodar() {
        automacao.processar();
    }
}
