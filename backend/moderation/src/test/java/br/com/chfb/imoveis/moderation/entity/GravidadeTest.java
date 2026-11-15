package br.com.chfb.imoveis.moderation.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GravidadeTest {

    @Test
    void variacoesDoMesmoNomeTemAMesmaChave() {
        for (String v : new String[] {"Grave", "grave", "GRAVE", "Gráve", " Grave ", "grave\t", "Grâve"}) {
            assertEquals("grave", Gravidade.normalizar(v), v);
        }
        assertEquals("muito grave", Gravidade.normalizar("  Muito   Gráve "));
        assertEquals("media", Gravidade.normalizar("Média"));
    }

    @Test
    void nomeGravadoSemEspacosNasPontas() {
        Gravidade g = new Gravidade();
        g.setNome("  Muito   grave  ");
        assertEquals("Muito grave", g.getNome());
        assertEquals("muito grave", g.getNomeNormalizado());
    }
}
