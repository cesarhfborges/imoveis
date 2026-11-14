package br.com.chfb.imoveis.coreapi.security;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Trava a API de sessão (/app/**) para o próprio front:
 * <ul>
 *     <li>recusa chamadas que o navegador marca como vindas de outro site (Sec-Fetch-Site: cross-site);</li>
 *     <li>recusa Origin que não seja o próprio servidor nem uma das origens do front configuradas;</li>
 *     <li>em métodos que alteram dados, exige Origin ou Referer de uma origem permitida.</li>
 * </ul>
 * Junto com o token CSRF e o cookie SameSite=Strict, impede o uso da sessão por outros sites.
 */
public class FrontendOnlyFilter extends OncePerRequestFilter {

    private static final Set<String> SEGUROS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final List<String> origensPermitidas;

    public FrontendOnlyFilter(List<String> origensPermitidas) {
        this.origensPermitidas = origensPermitidas == null ? List.of()
                : origensPermitidas.stream().map(FrontendOnlyFilter::normalizar).toList();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String fetchSite = req.getHeader("Sec-Fetch-Site");
        if ("cross-site".equalsIgnoreCase(fetchSite) && !permitida(req.getHeader("Origin"), req)) {
            negar(req, res);
            return;
        }
        String origin = req.getHeader("Origin");
        if (origin != null && !"null".equals(origin) && !permitida(origin, req)) {
            negar(req, res);
            return;
        }
        if (!SEGUROS.contains(req.getMethod().toUpperCase(Locale.ROOT))) {
            String fonte = origin != null ? origin : origemDoReferer(req.getHeader("Referer"));
            if (fonte == null || !permitida(fonte, req)) {
                negar(req, res);
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private boolean permitida(String origem, HttpServletRequest req) {
        if (origem == null) {
            return false;
        }
        String o = normalizar(origem);
        return o.equals(normalizar(propriaOrigem(req))) || origensPermitidas.contains(o);
    }

    private static String propriaOrigem(HttpServletRequest req) {
        int porta = req.getServerPort();
        boolean padrao = ("http".equals(req.getScheme()) && porta == 80) || ("https".equals(req.getScheme()) && porta == 443);
        return req.getScheme() + "://" + req.getServerName() + (padrao ? "" : ":" + porta);
    }

    private static String origemDoReferer(String referer) {
        if (referer == null) {
            return null;
        }
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String normalizar(String origem) {
        String o = origem.trim().toLowerCase(Locale.ROOT);
        while (o.endsWith("/")) {
            o = o.substring(0, o.length() - 1);
        }
        return o;
    }

    private static void negar(HttpServletRequest req, HttpServletResponse res) throws IOException {
        JsonErrorWriter.write(req, res, 403, "Forbidden", "Esta rota só pode ser usada pelo site.");
    }
}
