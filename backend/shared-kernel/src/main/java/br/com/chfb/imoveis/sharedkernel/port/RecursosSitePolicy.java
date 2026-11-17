package br.com.chfb.imoveis.sharedkernel.port;

/** Recursos do site ligados/desligados pela administração (aba Regras em /admin/configuracoes). */
public interface RecursosSitePolicy {

    /** Botão "Simular financiamento" nos anúncios e resumo de financiamento no painel do cliente. */
    boolean simulacaoFinanciamento();

    /** Aviso de favoritos que baixaram de preço (painel do cliente e página de favoritos). */
    boolean alertaQuedaPreco();
}
