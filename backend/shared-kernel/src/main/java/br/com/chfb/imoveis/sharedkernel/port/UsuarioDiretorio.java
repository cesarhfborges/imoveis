package br.com.chfb.imoveis.sharedkernel.port;

import java.util.List;

/** Consultas simples sobre usuários para os outros módulos (implementada no core-api). */
public interface UsuarioDiretorio {

    /** Ids dos usuários ativos com o papel de administrador. */
    List<Long> administradores();

    /** A conta existe e está ativa (não foi desativada nem banida)? */
    boolean contaAtiva(Long usuarioId);
}
