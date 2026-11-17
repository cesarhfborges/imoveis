package br.com.chfb.imoveis.listing.dto;

import java.time.Instant;

import br.com.chfb.imoveis.listing.entity.Contato;
import br.com.chfb.imoveis.listing.entity.EtapaContato;

public record ContatoDto(Long id, Long imovelId, String imovelCodigo, String imovelTitulo, String nome, String email,
        String telefone, String mensagem, boolean lido, Instant criadoEm, EtapaContato etapa, Instant etapaEm,
        String anotacoes) {

    public static ContatoDto of(Contato c) {
        return new ContatoDto(c.getId(), c.getImovel().getId(), c.getImovel().getCodigo(), c.getImovel().getTitulo(),
                c.getNome(), c.getEmail(), c.getTelefone(), c.getMensagem(), c.isLido(), c.getCriadoEm(), c.getEtapa(),
                c.getEtapaEm(), c.getAnotacoes());
    }
}
