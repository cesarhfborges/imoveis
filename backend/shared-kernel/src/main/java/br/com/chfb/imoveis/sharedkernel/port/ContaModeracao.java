package br.com.chfb.imoveis.sharedkernel.port;

/** Ações da moderação sobre a conta de um usuário (implementada no core-api). */
public interface ContaModeracao {

    /**
     * Bane a conta: ela fica inativa (não entra mais, sessões abertas caem) e guarda quando e por quê.
     *
     * @return {@code true} se a conta foi banida agora; {@code false} se não existe ou já estava inativa
     */
    boolean banir(Long usuarioId, String motivo);

    /**
     * Desfaz o banimento (ex.: o julgamento que baniu a conta foi revisto): a conta volta a ficar ativa.
     *
     * @return {@code true} se a conta estava banida e foi reativada agora
     */
    boolean reativar(Long usuarioId);
}
