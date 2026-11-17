package br.com.chfb.imoveis.coreapi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;

import br.com.chfb.imoveis.coreapi.config.AppProperties;

/** Na exclusão de conta só se apagam arquivos da pasta de uploads, nunca fora dela nem endereços externos. */
class UploadArquivoLocalTest {

    private final UploadService uploads = new UploadService(
            new AppProperties(null, new AppProperties.Uploads("/srv/uploads", DataSize.ofMegabytes(5)), null, null));

    @Test
    void enderecoDeUploadViraArquivo() {
        assertEquals(Path.of("/srv/uploads/abc.jpg"), uploads.arquivoLocal("/app/public/uploads/abc.jpg").orElseThrow());
    }

    @Test
    void ignoraExternoEForaDaPasta() {
        assertTrue(uploads.arquivoLocal("https://exemplo.com/a.jpg").isEmpty());
        assertTrue(uploads.arquivoLocal("/app/public/uploads/../segredo.txt").isEmpty());
        assertTrue(uploads.arquivoLocal("/app/public/uploads/").isEmpty());
        assertTrue(uploads.arquivoLocal(null).isEmpty());
    }
}
