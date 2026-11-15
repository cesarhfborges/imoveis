package br.com.chfb.imoveis.listing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.TipoImovel;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioEditadoEvent.Alteracao;

class AlteracoesAnuncioTest {

    private static Imovel imovel() {
        Imovel i = new Imovel();
        i.setTitulo("Apartamento 2 quartos");
        i.setFinalidade(Finalidade.VENDA);
        i.setTipo(TipoImovel.APARTAMENTO);
        i.setPreco(new BigDecimal("450000"));
        i.setEndereco("SQN 210 Bloco A");
        i.setBairro("Asa Norte");
        i.setCidade("Brasília");
        i.setUf("DF");
        i.getFotos().add(new FotoImovel("/f/1.jpg", null));
        i.getCaracteristicas().add("Piscina");
        return i;
    }

    @Test
    void semMudancaNaoGeraAlteracao() {
        assertTrue(AlteracoesAnuncio.retrato(imovel()).comparar(AlteracoesAnuncio.retrato(imovel())).isEmpty());
    }

    @Test
    void listaCamposAlteradosFormatados() {
        Imovel antes = imovel();
        Imovel depois = imovel();
        depois.setEndereco("SQN 211 Bloco B");
        depois.setPreco(new BigDecimal("430000"));
        depois.setDescricao("   "); // vazio = não informado, igual ao nulo de antes
        depois.getFotos().add(new FotoImovel("/f/2.jpg", null));
        depois.getCaracteristicas().add("Churrasqueira");

        List<Alteracao> lista = AlteracoesAnuncio.retrato(antes).comparar(AlteracoesAnuncio.retrato(depois));

        assertEquals(List.of("Preço", "Endereço", "Características", "Fotos"), lista.stream().map(Alteracao::campo).toList());
        Alteracao endereco = lista.get(1);
        assertEquals("SQN 210 Bloco A", endereco.antes());
        assertEquals("SQN 211 Bloco B", endereco.depois());
        assertTrue(lista.get(0).antes().contains("450.000,00"));
        assertEquals("Adicionadas: Churrasqueira", lista.get(2).depois());
        assertEquals("2 fotos (1 nova)", lista.get(3).depois());
    }
}
