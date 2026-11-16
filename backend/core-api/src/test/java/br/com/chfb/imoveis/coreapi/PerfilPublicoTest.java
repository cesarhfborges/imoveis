package br.com.chfb.imoveis.coreapi;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.service.UsuarioService;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/** Regras para o anunciante ter perfil público (/anunciante/{id} e diretório /imobiliarias). */
class PerfilPublicoTest {

    private static Usuario completo(String tipo) {
        Usuario u = new Usuario();
        u.setNome("Imobiliária Exemplo");
        u.setTipoAnunciante(tipo);
        u.setRazaoSocial("Exemplo Ltda");
        u.setPapeis(EnumSet.of(Perfil.CLIENTE, Perfil.CORRETOR));
        u.setFotoUrl("/uploads/logo.png");
        u.setCreci("12345");
        u.setCreciUf("DF");
        u.setTelefone("61999998888");
        u.setSobre("Atendemos todo o DF.");
        u.setCep("70040010");
        u.setLogradouro("SBN Quadra 1");
        u.setNumero("10");
        u.setBairro("Asa Norte");
        u.setCidade("Brasília");
        u.setUf("DF");
        u.setLatitude(new BigDecimal("-15.79"));
        u.setLongitude(new BigDecimal("-47.88"));
        return u;
    }

    @Test
    void cadastroCompletoNaoTemPendencias() {
        assertEquals(List.of(), UsuarioService.pendenciasPerfilPublico(completo("IMOBILIARIA")));
    }

    @Test
    void semFotoEnderecoEPosicaoListaOQueFalta() {
        Usuario u = completo("CORRETOR");
        u.setFotoUrl(null);
        u.setNumero(null);
        u.setLatitude(null);
        assertEquals(List.of("foto ou logo", "logradouro e número", "posição no mapa"), UsuarioService.pendenciasPerfilPublico(u));
    }

    @Test
    void imobiliariaPrecisaDeRazaoSocial() {
        Usuario u = completo("IMOBILIARIA");
        u.setRazaoSocial(null);
        assertEquals(List.of("razão social"), UsuarioService.pendenciasPerfilPublico(u));
    }

    @Test
    void whatsappSubstituiTelefone() {
        Usuario u = completo("CORRETOR");
        u.setTelefone(null);
        u.setWhatsapp("61988887777");
        assertEquals(List.of(), UsuarioService.pendenciasPerfilPublico(u));
    }

    @Test
    void perfilSoApareceParaAnuncianteAtivoComPerfilLigado() {
        Usuario u = completo("CORRETOR");
        u.setAtivo(true);
        assertFalse(UsuarioService.temPerfilPublico(u));
        u.setPerfilPublico(true);
        assertTrue(UsuarioService.temPerfilPublico(u));
        u.setAtivo(false);
        assertFalse(UsuarioService.temPerfilPublico(u));
        u.setAtivo(true);
        u.setPapeis(EnumSet.of(Perfil.CLIENTE));
        assertFalse(UsuarioService.temPerfilPublico(u));
    }
}
