package br.com.chfb.imoveis.listing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/**
 * Foto de um anúncio. {@code origem} informa ao cliente o que o anunciante declarou sobre a
 * imagem: foto real, criada/alterada com IA ou não informado.
 */
@Embeddable
public class FotoImovel {

    @Column(name = "url", length = 500, nullable = false)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem", length = 20, nullable = false)
    private OrigemFoto origem = OrigemFoto.NAO_INFORMADO;

    protected FotoImovel() {
    }

    public FotoImovel(String url, OrigemFoto origem) {
        this.url = url;
        this.origem = origem == null ? OrigemFoto.NAO_INFORMADO : origem;
    }

    public String getUrl() { return url; }
    public OrigemFoto getOrigem() { return origem; }
}
