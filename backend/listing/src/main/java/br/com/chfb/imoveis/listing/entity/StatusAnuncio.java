package br.com.chfb.imoveis.listing.entity;

public enum StatusAnuncio {
    /** Aguardando aprovação de um administrador. */
    PENDENTE,
    /** Visível na busca pública. */
    ATIVO,
    /** Pausado pelo anunciante. */
    PAUSADO,
    /** Vendido ou alugado. */
    CONCLUIDO,
    /** Reprovado/bloqueado por um administrador. */
    BLOQUEADO
}
