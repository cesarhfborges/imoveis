package br.com.chfb.imoveis.listing.entity;

/**
 * Origem de uma foto do anúncio, declarada pelo anunciante.
 * <ul>
 *   <li>{@link #REAL}: foto real do imóvel, sem alterações;</li>
 *   <li>{@link #IA}: imagem criada ou alterada com inteligência artificial;</li>
 *   <li>{@link #NAO_INFORMADO}: o anunciante não informou (valor padrão).</li>
 * </ul>
 */
public enum OrigemFoto {
    REAL,
    IA,
    NAO_INFORMADO
}
