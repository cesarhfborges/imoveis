package br.com.chfb.imoveis.sharedkernel.port;

/** Como o telefone do anunciante aparece no site público (configurado em /admin/configuracoes). */
public interface ExibicaoTelefonePolicy {

    enum Modo {
        /** Telefone completo para todos. */
        MOSTRAR,
        /** Não exibe o telefone do anunciante. */
        OCULTAR,
        /** Mostra só o início; o número completo só para quem está logado, ao clicar em "Ver telefone". */
        MOSTRAR_APENAS_LOGADO
    }

    Modo telefoneAnunciante();
}
