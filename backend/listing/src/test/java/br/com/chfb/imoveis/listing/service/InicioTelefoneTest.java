package br.com.chfb.imoveis.listing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy;
import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy.Modo;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/** No modo MOSTRAR_APENAS_LOGADO o site público só recebe o início do telefone. */
class InicioTelefoneTest {

    @Test
    void celularMostraDddEPrimeiraParte() {
        assertEquals("6199999", ExibicaoTelefonePolicy.inicio("61999998888"));
    }

    @Test
    void fixoMostraDddEPrimeiraParte() {
        assertEquals("613333", ExibicaoTelefonePolicy.inicio("6133334444"));
    }

    @Test
    void numeroCurtoNaoVazaNada() {
        assertEquals("", ExibicaoTelefonePolicy.inicio("1234"));
    }

    private static final AuthUser LOGADO = new AuthUser(1L, "Maria", "maria@ex.com", Perfil.CLIENTE, AuthUser.VIA_SESSION);

    @Test
    void logadoVeCompletoSemClicar() {
        assertEquals(Modo.MOSTRAR, ExibicaoTelefonePolicy.efetivo(Modo.MOSTRAR_APENAS_LOGADO, LOGADO != null));
    }

    @Test
    void visitanteContinuaComNumeroParcial() {
        assertEquals(Modo.MOSTRAR_APENAS_LOGADO, ExibicaoTelefonePolicy.efetivo(Modo.MOSTRAR_APENAS_LOGADO, false));
    }

    @Test
    void ocultarValeAteParaLogado() {
        assertEquals(Modo.OCULTAR, ExibicaoTelefonePolicy.efetivo(Modo.OCULTAR, true));
    }
}
