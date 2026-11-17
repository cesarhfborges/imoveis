package br.com.chfb.imoveis.listing.entity;

/** Situação de uma visita agendada. */
public enum StatusVisita {
    /** Pedida pelo cliente, aguardando o anunciante. */
    SOLICITADA,
    CONFIRMADA,
    /** O anunciante propôs outro horário; aguardando o cliente. */
    NOVO_HORARIO,
    RECUSADA,
    CANCELADA;

    /** Ainda ocupa o horário (não foi recusada nem cancelada). */
    public boolean emAndamento() {
        return this == SOLICITADA || this == CONFIRMADA || this == NOVO_HORARIO;
    }
}
