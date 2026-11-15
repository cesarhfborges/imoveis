package br.com.chfb.imoveis.platform.aviso;

import java.util.Set;

/** Como o aviso aparece, com as posições que cada componente do PrimeNG aceita. */
public enum TipoAviso {
    /** Barra com p-message fixa no topo ou no rodapé da página. */
    MENSAGEM(Set.of("top", "bottom")),
    /** p-drawer: painel que desliza de uma das bordas. */
    DRAWER(Set.of("left", "right", "top", "bottom", "full")),
    /** p-dialog: janela, no centro ou encostada numa borda/canto. */
    DIALOG(Set.of("center", "top", "bottom", "left", "right", "topleft", "topright", "bottomleft", "bottomright"));

    private final Set<String> posicoes;

    TipoAviso(Set<String> posicoes) {
        this.posicoes = posicoes;
    }

    public Set<String> posicoes() {
        return posicoes;
    }
}
