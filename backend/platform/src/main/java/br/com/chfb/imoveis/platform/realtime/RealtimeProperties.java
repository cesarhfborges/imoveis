package br.com.chfb.imoveis.platform.realtime;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tempo real (servidor Soketi, protocolo Pusher).
 *
 * @param ativo   liga/desliga (desligado: nada é enviado e o front segue atualizando por consulta periódica)
 * @param appId   id do app no Soketi
 * @param key     chave pública do app (vai para o navegador)
 * @param secret  segredo do app (só no backend: assina eventos e autorizações de canal)
 * @param url     endereço da API HTTP do Soketi visto pelo backend (ex.: http://localhost:6001)
 * @param cliente como o navegador se conecta ao WebSocket
 */
@ConfigurationProperties("app.realtime")
public record RealtimeProperties(boolean ativo, String appId, String key, String secret, String url, Cliente cliente) {

    /**
     * @param wsHost   host do WebSocket (vazio = o mesmo host do site)
     * @param wsPort   porta sem TLS
     * @param wssPort  porta com TLS
     * @param wsPath   caminho (para quando o WebSocket passa por um proxy reverso, ex.: "/ws")
     * @param forceTls usar wss://
     */
    public record Cliente(String wsHost, Integer wsPort, Integer wssPort, String wsPath, boolean forceTls) {
    }

    public RealtimeProperties {
        if (cliente == null) {
            cliente = new Cliente(null, 6001, 443, null, false);
        }
    }
}
