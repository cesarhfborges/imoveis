package br.com.chfb.imoveis.coreapi.service;

import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.sharedkernel.util.Slug;

/**
 * {@code /sitemap.xml} e {@code /robots.txt} para os buscadores: páginas públicas, anúncios ativos, perfis públicos de
 * anunciantes e documentos públicos. Gerado na hora (consultas leves, só id, título e data).
 */
@Service
public class SitemapService {

    /** Limite do protocolo de sitemap por arquivo. */
    static final int LIMITE = 50_000;

    /** Rotas públicas fixas do site (as mesmas de scripts/rotas-estaticas.mjs que fazem sentido indexar). */
    static final List<String> PAGINAS = List.of("", "/venda", "/aluguel", "/imovel-novo", "/temporada", "/mapa",
            "/imobiliarias", "/anunciar", "/documentos");

    /** Áreas que não devem ser indexadas. */
    static final List<String> BLOQUEADAS = List.of("/conta", "/admin", "/app/", "/api/", "/acesso-negado", "/nao-encontrado");

    private static final DateTimeFormatter DATA = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);

    private final JdbcClient jdbc;
    private final ConfiguracaoService configuracao;

    public SitemapService(JdbcClient jdbc, ConfiguracaoService configuracao) {
        this.jdbc = jdbc;
        this.configuracao = configuracao;
    }

    @Transactional
    public boolean ligado() {
        return configuracao.atual().isSitemapSeo();
    }

    /** @param base origem pública, sem barra no fim (ex.: https://imoveis.com.br) */
    @Transactional(readOnly = true)
    public String sitemap(String base) {
        StringBuilder x = new StringBuilder(64 * 1024);
        x.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        x.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        int[] total = {0};
        for (String p : PAGINAS) {
            url(x, base + (p.isEmpty() ? "/" : p), null, "daily", p.isEmpty() ? "1.0" : "0.8");
            total[0]++;
        }
        jdbc.sql("select id, titulo, atualizado_em from imoveis where status = 'ATIVO' order by atualizado_em desc limit :limite")
                .param("limite", LIMITE - PAGINAS.size())
                .query(rs -> {
                    url(x, base + "/imovel/" + rs.getLong(1) + caminho(rs.getString(2)), rs.getTimestamp(3), "weekly", "0.9");
                    total[0]++;
                });
        jdbc.sql("""
                select u.id, u.nome, u.atualizado_em from usuarios u
                where u.ativo and u.perfil_publico
                  and exists (select 1 from usuario_papeis p where p.usuario_id = u.id and p.papel = 'CORRETOR')
                order by u.id limit :limite
                """).param("limite", Math.max(LIMITE - total[0], 0))
                .query(rs -> {
                    url(x, base + "/anunciante/" + rs.getLong(1) + caminho(rs.getString(2)), rs.getTimestamp(3), "weekly", "0.6");
                    total[0]++;
                });
        jdbc.sql("""
                select slug, atualizado_em from documentos
                where ativo and publico and excluido_em is null order by slug limit :limite
                """).param("limite", Math.max(LIMITE - total[0], 0))
                .query(rs -> {
                    url(x, base + "/documentos/" + rs.getString(1), rs.getTimestamp(2), "monthly", "0.3");
                });
        return x.append("</urlset>\n").toString();
    }

    /** Liberado para todos; áreas privadas bloqueadas; o sitemap só é anunciado com a regra ligada. */
    public String robots(String base, boolean comSitemap) {
        StringBuilder r = new StringBuilder("User-agent: *\nAllow: /\n");
        BLOQUEADAS.forEach(b -> r.append("Disallow: ").append(b).append('\n'));
        if (comSitemap) {
            r.append("\nSitemap: ").append(base).append("/sitemap.xml\n");
        }
        return r.toString();
    }

    private static String caminho(String titulo) {
        String s = Slug.de(titulo);
        return s.isEmpty() ? "" : "/" + s;
    }

    private static void url(StringBuilder x, String loc, Timestamp lastmod, String freq, String prioridade) {
        x.append("  <url><loc>").append(escapar(loc)).append("</loc>");
        if (lastmod != null) {
            x.append("<lastmod>").append(DATA.format(lastmod.toInstant())).append("</lastmod>");
        }
        x.append("<changefreq>").append(freq).append("</changefreq><priority>").append(prioridade).append("</priority></url>\n");
    }

    static String escapar(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }
}
