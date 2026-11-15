package br.com.chfb.imoveis.moderation.entity;

/** Consequência para a conta do anunciante quando a denúncia é julgada procedente. */
public enum PenalidadeConta {
    /** Só fica no histórico: não conta para o banimento automático. */
    NENHUMA,
    /** Strike: conta para a regra de banimento automático da gravidade da denúncia. */
    STRIKE,
    /** Banimento direto da conta (ex.: conteúdo ilegal), sem esperar a regra da gravidade. */
    BANIR_CONTA
}
