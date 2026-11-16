package br.com.chfb.imoveis.listing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy.Modo;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/** No modo MOSTRAR_APENAS_LOGADO o site público só recebe o início do telefone. */
class InicioTelefoneTest {

    @Test
    void celularMostraDddEPrimeiraParte() {
        assertEquals("6199999", ImovelService.inicioTelefone("61999998888"));
    }

    @Test
    void fixoMostraDddEPrimeiraParte() {
        assertEquals("613333", ImovelService.inicioTelefone("6133334444"));
    }

    @Test
    void numeroCurtoNaoVazaNada() {
        assertEquals("", ImovelService.inicioTelefone("1234"));
    }

    private static final AuthUser LOGADO = new AuthUser(1L, "Maria", "maria@ex.com", Perfil.CLIENTE, AuthUser.VIA_SESSION);

    @Test
    void logadoVeCompletoSemClicar() {
        assertEquals(Modo.MOSTRAR, ImovelService.modoTelefonePara(Modo.MOSTRAR_APENAS_LOGADO, LOGADO));
    }

    @Test
    void visitanteContinuaComNumeroParcial() {
        assertEquals(Modo.MOSTRAR_APENAS_LOGADO, ImovelService.modoTelefonePara(Modo.MOSTRAR_APENAS_LOGADO, null));
    }

    @Test
    void ocultarValeAteParaLogado() {
        assertEquals(Modo.OCULTAR, ImovelService.modoTelefonePara(Modo.OCULTAR, LOGADO));
    }
}
