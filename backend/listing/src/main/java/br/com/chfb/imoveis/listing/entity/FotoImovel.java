package br.com.chfb.imoveis.listing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Foto de um anúncio. {@code editadaIa} informa ao cliente se a imagem foi criada ou
 * alterada com inteligência artificial (true) ou se é uma foto real sem alterações (false).
 */
@Embeddable
public class FotoImovel {

    @Column(name = "url", length = 500, nullable = false)
    private String url;

    @Column(name = "editada_ia", nullable = false)
    private boolean editadaIa;

    protected FotoImovel() {
    }

    public FotoImovel(String url, boolean editadaIa) {
        this.url = url;
        this.editadaIa = editadaIa;
    }

    public String getUrl() { return url; }
    public boolean isEditadaIa() { return editadaIa; }
}
