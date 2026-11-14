package br.com.chfb.imoveis.coreapi;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.sharedkernel.security.Perfil;

class PerfilHierarquiaTest {

    @Test
    void adminEntraComoTodos() {
        assertEquals(EnumSet.allOf(Perfil.class), Perfil.permitidosPara(Set.of(Perfil.ADMIN)));
    }

    @Test
    void corretorEntraComoCorretorOuCliente() {
        assertEquals(EnumSet.of(Perfil.CORRETOR, Perfil.CLIENTE), Perfil.permitidosPara(Set.of(Perfil.CORRETOR)));
    }

    @Test
    void clienteEntraSoComoCliente() {
        assertEquals(EnumSet.of(Perfil.CLIENTE), Perfil.permitidosPara(Set.of(Perfil.CLIENTE)));
    }
}
