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
    BLOQUEADO,
    /** Suspenso pela moderação (denúncia): fora da busca; só um administrador (ou a aprovação da solução) reativa. */
    SUSPENSO,
    /** Banido pela moderação: fora da busca, definitivo; o anunciante vê, mas não edita nem reativa. */
    BANIDO
}
