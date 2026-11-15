package br.com.chfb.imoveis.sharedkernel.event;

/**
 * Publicado (de forma síncrona, dentro da transação) logo antes de um anúncio ser excluído.
 * Outros módulos podem limpar o que guardam sobre ele ou impedir a exclusão lançando uma exceção.
 */
public record AnuncioExcluindoEvent(Long imovelId) {
}
