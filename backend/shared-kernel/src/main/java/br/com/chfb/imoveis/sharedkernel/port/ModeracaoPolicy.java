package br.com.chfb.imoveis.sharedkernel.port;

/** Diz se anúncios novos de corretores precisam de aprovação de um administrador. */
public interface ModeracaoPolicy {

    boolean exigeAprovacao();
}
