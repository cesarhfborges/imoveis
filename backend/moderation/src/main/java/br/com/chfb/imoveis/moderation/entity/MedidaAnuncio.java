package br.com.chfb.imoveis.moderation.entity;

/** O que acontece com o anúncio quando a denúncia é julgada procedente. */
public enum MedidaAnuncio {
    /** O anúncio continua (ou volta) no ar. */
    MANTER,
    /**
     * Correção solicitada: a denúncia continua aberta, aguardando o anunciante corrigir dentro do prazo; a moderação
     * aceita a correção (encerra como procedente) ou toma outra medida.
     */
    CORRIGIR,
    /** Suspenso: fora da busca até um administrador reativar. */
    SUSPENDER,
    /** Removido do ar (banido): fora do site de forma definitiva (encerra as outras pendências do anúncio). */
    BANIR
}
