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

    /** Em MOSTRAR_APENAS_LOGADO, quem já está logado recebe o telefone completo, sem precisar clicar em "Ver". */
    static Modo efetivo(Modo modo, boolean logado) {
        return modo == Modo.MOSTRAR_APENAS_LOGADO && logado ? Modo.MOSTRAR : modo;
    }

    /** "61999998888" → "6199999" (DDD e primeira parte); fixo "6133334444" → "613333". */
    static String inicio(String telefone) {
        return telefone == null || telefone.length() <= 4 ? "" : telefone.substring(0, telefone.length() - 4);
    }
}
