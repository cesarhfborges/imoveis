package br.com.chfb.imoveis.listing.entity;

public enum TipoImovel {
    APARTAMENTO("Apartamento"),
    CASA("Casa"),
    CASA_CONDOMINIO("Casa em condomínio"),
    COBERTURA("Cobertura"),
    KITNET("Kitnet / Studio"),
    FLAT("Flat"),
    LOTE("Lote / Terreno"),
    SALA("Sala comercial"),
    LOJA("Loja"),
    GALPAO("Galpão"),
    PREDIO("Prédio"),
    CHACARA("Chácara / Rural");

    private final String descricao;

    TipoImovel(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
