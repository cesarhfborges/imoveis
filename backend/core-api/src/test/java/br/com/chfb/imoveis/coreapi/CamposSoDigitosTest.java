package br.com.chfb.imoveis.coreapi;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.coreapi.entity.Configuracao;
import br.com.chfb.imoveis.coreapi.entity.Usuario;

/** CEP, CPF/CNPJ e telefones vão para o banco só com dígitos, venham formatados ou não. */
class CamposSoDigitosTest {

    @Test
    void usuarioGuardaSoDigitos() {
        Usuario u = new Usuario();
        u.setTelefone("(61) 99999-8888");
        u.setWhatsapp("+55 (61) 3333-4444");
        u.setCep("70.040-010");
        u.setDocumento("123.456.789-09");
        assertEquals("61999998888", u.getTelefone());
        assertEquals("556133334444", u.getWhatsapp());
        assertEquals("70040010", u.getCep());
        assertEquals("12345678909", u.getDocumento());
    }

    @Test
    void vazioViraNulo() {
        Usuario u = new Usuario();
        u.setTelefone("  ");
        u.setCep("___.___-___");
        u.setDocumento(null);
        assertNull(u.getTelefone());
        assertNull(u.getCep());
        assertNull(u.getDocumento());
    }

    @Test
    void configuracaoGuardaSoDigitos() {
        Configuracao c = new Configuracao();
        c.setTelefoneContato("(61) 0000-0000");
        c.setWhatsapp("(61) 90000-0000");
        assertEquals("6100000000", c.getTelefoneContato());
        assertEquals("61900000000", c.getWhatsapp());
    }
}
