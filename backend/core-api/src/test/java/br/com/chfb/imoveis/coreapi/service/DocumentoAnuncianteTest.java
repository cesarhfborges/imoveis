package br.com.chfb.imoveis.coreapi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.util.DocumentoFiscal;

/** Alteração de CPF/CNPJ e tipo de anunciante (Meus dados e administração). */
class DocumentoAnuncianteTest {

    @Test
    void validaDigitosVerificadores() {
        assertTrue(DocumentoFiscal.cpfValido("529.982.247-25"));
        assertFalse(DocumentoFiscal.cpfValido("529.982.247-26"));
        assertFalse(DocumentoFiscal.cpfValido("111.111.111-11"));
        assertTrue(DocumentoFiscal.cnpjValido("11.222.333/0001-81"));
        assertFalse(DocumentoFiscal.cnpjValido("11.222.333/0001-82"));
        assertFalse(DocumentoFiscal.cnpjValido("529.982.247-25"));
    }

    @Test
    void corretorTrocaCpf() {
        Usuario u = corretor("12345678909");
        UsuarioService.aplicarDocumento(u, "CORRETOR", "529.982.247-25", true);
        assertEquals("52998224725", u.getDocumento());
    }

    @Test
    void recusaCpfInvalido() {
        Usuario u = corretor("12345678909");
        assertThrows(BusinessException.class, () -> UsuarioService.aplicarDocumento(u, "CORRETOR", "529.982.247-26", true));
    }

    @Test
    void virarImobiliariaExigeCnpj() {
        Usuario u = corretor("12345678909");
        assertThrows(BusinessException.class, () -> UsuarioService.aplicarDocumento(u, "IMOBILIARIA", null, true));
        UsuarioService.aplicarDocumento(u, "IMOBILIARIA", "11.222.333/0001-81", true);
        assertEquals("IMOBILIARIA", u.getTipoAnunciante());
        assertEquals("11222333000181", u.getDocumento());
    }

    @Test
    void contaNaoApagaDocumentoMasAdminApaga() {
        Usuario u = corretor("12345678909");
        UsuarioService.aplicarDocumento(u, null, "", true);
        assertEquals("12345678909", u.getDocumento());
        UsuarioService.aplicarDocumento(u, "CORRETOR", "", false);
        assertNull(u.getDocumento());
    }

    @Test
    void documentoAntigoSemMudancaNaoTrava() {
        Usuario u = corretor("00000000001"); // gravado antes da validação
        UsuarioService.aplicarDocumento(u, "CORRETOR", null, true);
        assertEquals("00000000001", u.getDocumento());
    }

    private static Usuario corretor(String documento) {
        Usuario u = new Usuario();
        u.setTipoAnunciante("CORRETOR");
        u.setDocumento(documento);
        return u;
    }
}
