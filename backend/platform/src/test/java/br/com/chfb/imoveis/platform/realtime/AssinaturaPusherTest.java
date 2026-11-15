package br.com.chfb.imoveis.platform.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Valores do exemplo oficial da documentação do protocolo Pusher (autorização de canal privado). */
class AssinaturaPusherTest {

    @Test
    void assinaturaDeCanalPrivadoConfereComADocumentacao() {
        String assinatura = AssinaturaPusher.hmacSha256("7ad3773142a6692b25b8", "1234.1234:private-foobar");
        assertEquals("58df8b0c36d6982b82c3ecf6b4662e34fe8c25bba48f5369f135bf843651c3a4", assinatura);
    }

    @Test
    void md5DoCorpo() {
        assertEquals("ec365a775a4cd0599faeb73354201b6f", AssinaturaPusher.md5("{\"name\":\"foo\",\"channels\":[\"project-3\"],\"data\":\"{\\\"some\\\":\\\"data\\\"}\"}"));
    }
}
