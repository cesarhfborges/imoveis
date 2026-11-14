package br.com.chfb.imoveis.listing.dto;

import java.util.List;

/** Opções para montar os filtros da busca (tipos e localidades com anúncios ativos). */
public record OpcoesBusca(List<Opcao> tipos, List<Localidade> localidades) {

    public record Opcao(String value, String label) {
    }

    public record Localidade(String uf, String cidade, List<String> bairros) {
    }
}
