package br.com.chfb.imoveis.sharedkernel.port;

/** Recursos do site ligados/desligados pela administração (aba Regras em /admin/configuracoes). */
public interface RecursosSitePolicy {

    /** Botão "Simular financiamento" nos anúncios e resumo de financiamento no painel do cliente. */
    boolean simulacaoFinanciamento();

    /** Aviso de favoritos que baixaram de preço (painel do cliente e página de favoritos). */
    boolean alertaQuedaPreco();

    /** Registro e histórico dos imóveis vistos pelo usuário logado. */
    boolean vistosRecentes();

    /** Relatório de cada anúncio para o anunciante (o administrador sempre vê). */
    boolean relatorioAnuncio();

    /** Etapas e anotações nos contatos recebidos pelo anunciante. */
    boolean etapasContatos();

    /** Agendamento de visitas pela página do imóvel. */
    boolean agendamentoVisita();
}
