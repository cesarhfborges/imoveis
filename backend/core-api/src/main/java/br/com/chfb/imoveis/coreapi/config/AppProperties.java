package br.com.chfb.imoveis.coreapi.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Propriedades "app.*" definidas em application.yml (e sobrescritas em application-dev.yml). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Security security, Uploads uploads, Seed seed, Bootstrap bootstrap) {

    /**
     * @param frontendOrigins origens (scheme://host:porta) do front que podem usar /app/** com cookie de sessão
     * @param apiCorsOrigins  origens liberadas no CORS da API aberta /api/v1/** ("*" libera todas)
     */
    public record Security(List<String> frontendOrigins, List<String> apiCorsOrigins) {
    }

    /**
     * @param dir      pasta onde os arquivos enviados são gravados
     * @param maxBytes tamanho máximo de cada arquivo
     */
    public record Uploads(String dir, long maxBytes) {
    }

    /** @param demo cria usuários e anúncios de exemplo quando o banco está vazio (apenas dev) */
    public record Seed(boolean demo) {
    }

    /** Administrador inicial criado em produção quando ainda não existe nenhum. */
    public record Bootstrap(String adminNome, String adminEmail, String adminSenha) {
    }
}
