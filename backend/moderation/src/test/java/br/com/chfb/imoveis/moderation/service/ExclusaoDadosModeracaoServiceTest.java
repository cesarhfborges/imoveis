package br.com.chfb.imoveis.moderation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.chfb.imoveis.moderation.entity.DenunciaMensagem;

/** Exclusão de conta (LGPD): os anexos citados nas mensagens das denúncias apagadas também saem. */
class ExclusaoDadosModeracaoServiceTest {

    @Test
    void encontraOsAnexosDaMensagem() {
        DenunciaMensagem m = new DenunciaMensagem();
        m.setAnexos("/app/denuncias/anexos/0b9f6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.png\n"
                + " /app/denuncias/anexos/1b9f6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf \n"
                + "/app/public/uploads/../../etc/passwd");
        assertEquals(List.of("0b9f6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.png", "1b9f6a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.pdf"),
                ExclusaoDadosModeracaoService.anexosDa(m));
    }

    @Test
    void mensagemSemAnexos() {
        assertTrue(ExclusaoDadosModeracaoService.anexosDa(new DenunciaMensagem()).isEmpty());
    }
}
