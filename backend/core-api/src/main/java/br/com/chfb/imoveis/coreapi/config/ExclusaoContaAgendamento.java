package br.com.chfb.imoveis.coreapi.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import br.com.chfb.imoveis.coreapi.service.SolicitacaoExclusaoService;

/**
 * Remoção das contas pedidas pelos próprios usuários: todo dia às 03:00 (horário de Brasília) apaga as que já
 * cumpriram o prazo de espera. Horário em app.exclusao-conta.cron; desliga com app.exclusao-conta.agendador=false.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.exclusao-conta.agendador", havingValue = "true", matchIfMissing = true)
public class ExclusaoContaAgendamento {

    private final SolicitacaoExclusaoService solicitacoes;

    public ExclusaoContaAgendamento(SolicitacaoExclusaoService solicitacoes) {
        this.solicitacoes = solicitacoes;
    }

    @Scheduled(cron = "${app.exclusao-conta.cron:0 0 3 * * *}", zone = "America/Sao_Paulo")
    public void rodar() {
        solicitacoes.executarVencidas();
    }
}
