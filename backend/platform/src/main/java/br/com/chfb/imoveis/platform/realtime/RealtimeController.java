package br.com.chfb.imoveis.platform.realtime;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.port.AutorizadorDeCanal;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.constraints.NotBlank;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tempo real:
 * <ul>
 *     <li>{@code GET /app/public/realtime}: como o navegador se conecta (chave pública, host, portas);</li>
 *     <li>{@code POST /app/realtime/auth}: autoriza a entrada num canal privado ({@code private-}) ou protegido
 *     ({@code presence-}); exige sessão e CSRF, e cada módulo diz quem pode entrar nos canais dele.</li>
 * </ul>
 */
@RestController
public class RealtimeController {

    private static final Pattern SOCKET_ID = Pattern.compile("^\\d+\\.\\d+$");
    private static final Pattern CANAL = Pattern.compile("^(private|presence)-[A-Za-z0-9_\\-=@,.;]{1,150}$");

    private final RealtimeProperties props;
    private final SoketiTempoReal soketi;
    private final List<AutorizadorDeCanal> autorizadores;
    private final JsonMapper json;

    public RealtimeController(RealtimeProperties props, SoketiTempoReal soketi, List<AutorizadorDeCanal> autorizadores,
            JsonMapper json) {
        this.props = props;
        this.soketi = soketi;
        this.autorizadores = autorizadores;
        this.json = json;
    }

    public record ConfigDto(boolean ativo, String key, String wsHost, Integer wsPort, Integer wssPort, String wsPath,
            boolean forceTls) {
    }

    public record AuthForm(@NotBlank String socket_id, @NotBlank String channel_name) {
    }

    @GetMapping("/app/public/realtime")
    public ConfigDto config() {
        RealtimeProperties.Cliente c = props.cliente();
        return props.ativo() ? new ConfigDto(true, props.key(), c.wsHost(), c.wsPort(), c.wssPort(), c.wsPath(), c.forceTls())
                : new ConfigDto(false, null, null, null, null, null, false);
    }

    @PostMapping("/app/realtime/auth")
    public Map<String, String> autorizar(@RequestBody AuthForm form, @AuthenticationPrincipal AuthUser u) {
        if (!props.ativo()) {
            throw new BusinessException(503, "Tempo real desligado");
        }
        String canal = form.channel_name();
        if (!SOCKET_ID.matcher(form.socket_id()).matches() || !CANAL.matcher(canal).matches()) {
            throw new BusinessException("Canal ou conexão inválidos");
        }
        boolean permitido = autorizadores.stream().map(a -> a.pode(canal, u)).filter(Objects::nonNull).findFirst()
                .orElse(false);
        if (!permitido) {
            throw new ForbiddenException("Sem acesso a este canal");
        }
        Map<String, String> r = new LinkedHashMap<>();
        if (canal.startsWith("presence-")) {
            // quem está na sala: id e nome/perfil, para a lista de presença
            Map<String, Object> membro = Map.of("user_id", String.valueOf(u.id()),
                    "user_info", Map.of("nome", u.nome(), "perfil", u.perfil().name()));
            String channelData = json.writeValueAsString(membro);
            r.put("auth", soketi.assinarCanal(form.socket_id(), canal, channelData));
            r.put("channel_data", channelData);
        } else {
            r.put("auth", soketi.assinarCanal(form.socket_id(), canal, null));
        }
        return r;
    }
}
