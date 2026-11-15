package br.com.chfb.imoveis.moderation.entity;

import java.util.EnumSet;
import java.util.Set;

public enum StatusDenuncia {
    /** Aberta, esperando o anunciante responder ou corrigir (o prazo corre). */
    AGUARDANDO_ANUNCIANTE,
    /** O anunciante respondeu; esperando um administrador analisar (o prazo fica parado). */
    EM_ANALISE,
    /** A empresa está verificando (ex.: visita ao imóvel); o prazo do anunciante fica parado. */
    EM_APURACAO,
    /** O administrador aprovou a solução do anunciante. */
    RESOLVIDA,
    /** O administrador julgou a denúncia improcedente. */
    IMPROCEDENTE,
    /** Confirmada: a denúncia procede e a medida foi aplicada (conta para o banimento da conta). */
    PROCEDENTE,
    /** Encerrada porque o anúncio foi banido. */
    ANUNCIO_BANIDO;

    public static final Set<StatusDenuncia> ABERTAS = EnumSet.of(AGUARDANDO_ANUNCIANTE, EM_ANALISE, EM_APURACAO);

    public boolean aberta() {
        return ABERTAS.contains(this);
    }
}
