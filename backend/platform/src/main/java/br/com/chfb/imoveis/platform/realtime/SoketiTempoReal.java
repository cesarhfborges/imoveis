package br.com.chfb.imoveis.platform.realtime;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import br.com.chfb.imoveis.sharedkernel.port.TempoReal;
import tools.jackson.databind.json.JsonMapper;

/**
 * Publica eventos no Soketi pela API HTTP do protocolo Pusher (POST /apps/{id}/events, assinado com HMAC).
 * O envio é assíncrono e só acontece depois do commit; falhas são registradas e não afetam a operação de origem
 * (o front também consulta periodicamente, então nada se perde se o Soketi estiver fora do ar).
 */
@Service
public class SoketiTempoReal implements TempoReal {

    private static final Logger log = LoggerFactory.getLogger(SoketiTempoReal.class);

    private final RealtimeProperties props;
    private final JsonMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public SoketiTempoReal(RealtimeProperties props, JsonMapper json) {
        this.props = props;
        this.json = json;
    }

    @Override
    public void publicar(String canal, String evento, Object dados) {
        if (!props.ativo()) {
            return;
        }
        // serializa agora (os dados podem ser entidades/DTOs que mudam depois); envia após o commit
        String corpo = corpo(canal, evento, dados);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enviar(canal, evento, corpo);
                }
            });
        } else {
            enviar(canal, evento, corpo);
        }
    }

    private String corpo(String canal, String evento, Object dados) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", evento);
        m.put("channel", canal);
        m.put("data", json.writeValueAsString(dados));
        return json.writeValueAsString(m);
    }

    private void enviar(String canal, String evento, String corpo) {
        String caminho = "/apps/" + props.appId() + "/events";
        Map<String, String> q = new TreeMap<>();
        q.put("auth_key", props.key());
        q.put("auth_timestamp", String.valueOf(System.currentTimeMillis() / 1000));
        q.put("auth_version", "1.0");
        q.put("body_md5", AssinaturaPusher.md5(corpo));
        String query = q.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining("&"));
        String assinatura = AssinaturaPusher.hmacSha256(props.secret(), "POST\n" + caminho + "\n" + query);
        HttpRequest req = HttpRequest.newBuilder(URI.create(props.url() + caminho + "?" + query + "&auth_signature=" + assinatura))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(corpo))
                .build();
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString()).whenComplete((r, erro) -> {
            if (erro != null) {
                log.warn("Tempo real: não foi possível publicar {} em {} ({})", evento, canal, erro.toString());
            } else if (r.statusCode() >= 300) {
                log.warn("Tempo real: o Soketi recusou {} em {}: HTTP {} {}", evento, canal, r.statusCode(), r.body());
            } else {
                log.debug("Tempo real: {} -> {}", evento, canal);
            }
        });
    }

    /** Assinatura da autorização de um canal privado/protegido. */
    String assinarCanal(String socketId, String canal, String channelData) {
        String texto = socketId + ":" + canal + (channelData == null ? "" : ":" + channelData);
        return props.key() + ":" + AssinaturaPusher.hmacSha256(props.secret(), texto);
    }
}
