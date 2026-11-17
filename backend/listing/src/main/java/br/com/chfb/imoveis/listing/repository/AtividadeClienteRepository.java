package br.com.chfb.imoveis.listing.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import br.com.chfb.imoveis.listing.dto.ClientePainel.ContatoEnviado;
import br.com.chfb.imoveis.listing.dto.ClientePainel.QuedaPreco;

/**
 * Registros e consultas da atividade do usuário logado (painel do cliente): imóveis vistos, histórico de preço,
 * contatos enviados, recomendações e novidades. SQL nativo; sempre filtrado pelo próprio usuário.
 */
@Repository
public class AtividadeClienteRepository {

    private final JdbcClient jdbc;

    public AtividadeClienteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void registrarVisto(Long usuarioId, Long imovelId) {
        jdbc.sql("""
                insert into imovel_vistos (usuario_id, imovel_id, visto_em) values (:u, :i, now())
                on conflict (usuario_id, imovel_id) do update set visto_em = now()
                """).param("u", usuarioId).param("i", imovelId).update();
    }

    public void registrarPreco(Long imovelId, BigDecimal anterior, BigDecimal novo) {
        jdbc.sql("insert into imovel_precos (imovel_id, preco_anterior, preco_novo) values (:i, :a, :n)")
                .param("i", imovelId).param("a", anterior).param("n", novo).update();
    }

    /** [total, vistos pelo anunciante] dos contatos enviados pelo usuário. */
    public long[] contatosEnviados(Long usuarioId) {
        return jdbc.sql("select count(*), count(*) filter (where lido) from contatos where usuario_id = :u")
                .param("u", usuarioId).query((rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)}).single();
    }

    public List<ContatoEnviado> contatosRecentes(Long usuarioId, int limite) {
        return jdbc.sql("""
                select c.id, i.id, i.titulo, i.bairro, i.cidade, i.status, c.mensagem, c.lido, c.criado_em,
                       (select f.url from imovel_fotos f where f.imovel_id = i.id order by f.ordem limit 1)
                from contatos c join imoveis i on i.id = c.imovel_id
                where c.usuario_id = :u order by c.criado_em desc limit :limite
                """).param("u", usuarioId).param("limite", limite)
                .query((rs, n) -> new ContatoEnviado(rs.getLong(1), rs.getLong(2), String.format("IM-%06d", rs.getLong(2)),
                        rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7),
                        rs.getBoolean(8), rs.getTimestamp(9).toInstant(), rs.getString(10)))
                .list();
    }

    /** Quantidade por mês ("yyyy-MM", no fuso) de favoritos ou contatos do usuário desde {@code inicio}. */
    public Map<String, Long> porMes(String tabela, Long usuarioId, Instant inicio, String fuso) {
        if (!tabela.equals("favoritos") && !tabela.equals("contatos")) {
            throw new IllegalArgumentException(tabela);
        }
        Map<String, Long> mapa = new HashMap<>();
        jdbc.sql("select to_char(criado_em at time zone :fuso, 'YYYY-MM'), count(*) from " + tabela
                        + " where usuario_id = :u and criado_em >= :inicio group by 1")
                .param("fuso", fuso).param("u", usuarioId).param("inicio", Timestamp.from(inicio))
                .query(rs -> {
                    mapa.put(rs.getString(1), rs.getLong(2));
                });
        return mapa;
    }

    public List<Long> vistosRecentes(Long usuarioId, int limite) {
        return jdbc.sql("""
                select v.imovel_id from imovel_vistos v join imoveis i on i.id = v.imovel_id
                where v.usuario_id = :u and i.status = 'ATIVO' order by v.visto_em desc limit :limite
                """).param("u", usuarioId).param("limite", limite).query(Long.class).list();
    }

    /**
     * Anúncios ativos parecidos com os favoritos e os vistos (mesma finalidade e cidade; pontua bairro, tipo e
     * faixa de preço), sem os já favoritados. Sem favoritos nem vistos, não há recomendação.
     */
    public List<Long> recomendados(Long usuarioId, int limite) {
        return jdbc.sql("""
                with pref as (
                    select i.finalidade, i.tipo, i.cidade, i.bairro, i.preco
                    from favoritos f join imoveis i on i.id = f.imovel_id where f.usuario_id = :u
                    union all
                    select i.finalidade, i.tipo, i.cidade, i.bairro, i.preco
                    from imovel_vistos v join imoveis i on i.id = v.imovel_id where v.usuario_id = :u
                ), faixa as (select min(preco) * 0.7 as pmin, max(preco) * 1.3 as pmax from pref)
                select c.id from imoveis c cross join faixa
                where c.status = 'ATIVO'
                  and c.id not in (select f.imovel_id from favoritos f where f.usuario_id = :u)
                  and exists (select 1 from pref p where p.finalidade = c.finalidade and p.cidade = c.cidade)
                order by (select count(*) from pref p where p.bairro = c.bairro and p.cidade = c.cidade) * 3
                       + (select count(*) from pref p where p.tipo = c.tipo)
                       + case when c.preco between faixa.pmin and faixa.pmax then 2 else 0 end desc,
                         c.destaque desc, c.criado_em desc
                limit :limite
                """).param("u", usuarioId).param("limite", limite).query(Long.class).list();
    }

    /** Bairros mais favoritados pelo usuário, como "bairro|cidade". */
    public List<String[]> bairrosFavoritos(Long usuarioId, int limite) {
        return jdbc.sql("""
                select i.bairro, i.cidade from favoritos f join imoveis i on i.id = f.imovel_id
                where f.usuario_id = :u group by i.bairro, i.cidade order by count(*) desc limit :limite
                """).param("u", usuarioId).param("limite", limite)
                .query((rs, n) -> new String[] {rs.getString(1), rs.getString(2)}).list();
    }

    /** Anúncios ativos publicados desde {@code desde} nos bairros informados (exceto os já favoritados). */
    public List<Long> novidades(Long usuarioId, List<String[]> bairros, Instant desde, int limite) {
        if (bairros.isEmpty()) {
            return List.of();
        }
        StringBuilder filtro = new StringBuilder();
        JdbcClient.StatementSpec sql;
        for (int k = 0; k < bairros.size(); k++) {
            filtro.append(k == 0 ? "" : " or ").append("(i.bairro = :b").append(k).append(" and i.cidade = :c").append(k).append(')');
        }
        sql = jdbc.sql("select i.id from imoveis i where i.status = 'ATIVO' and i.criado_em >= :desde and (" + filtro
                + ") and i.id not in (select f.imovel_id from favoritos f where f.usuario_id = :u)"
                + " order by i.criado_em desc limit :limite");
        for (int k = 0; k < bairros.size(); k++) {
            sql = sql.param("b" + k, bairros.get(k)[0]).param("c" + k, bairros.get(k)[1]);
        }
        return sql.param("desde", Timestamp.from(desde)).param("u", usuarioId).param("limite", limite)
                .query(Long.class).list();
    }

    /**
     * Favoritos cujo preço atual está abaixo do maior preço que tiveram desde que foram favoritados.
     */
    public List<QuedaPreco> quedasNosFavoritos(Long usuarioId) {
        return jdbc.sql("""
                select i.id, i.titulo, h.anterior, i.preco, h.alterado_em
                from favoritos f
                join imoveis i on i.id = f.imovel_id
                join lateral (
                    select max(p.preco_anterior) as anterior, max(p.alterado_em) as alterado_em
                    from imovel_precos p where p.imovel_id = i.id and p.alterado_em >= f.criado_em
                ) h on true
                where f.usuario_id = :u and h.anterior > i.preco
                order by h.alterado_em desc
                """).param("u", usuarioId)
                .query((rs, n) -> QuedaPreco.de(rs.getLong(1), rs.getString(2), rs.getBigDecimal(3),
                        rs.getBigDecimal(4), rs.getTimestamp(5).toInstant()))
                .list();
    }

    /** Favoritos ativos, à venda e que aceitam financiamento (para o resumo de financiamento). */
    public List<Long> favoritosFinanciaveis(Long usuarioId, int limite) {
        return jdbc.sql("""
                select i.id from favoritos f join imoveis i on i.id = f.imovel_id
                where f.usuario_id = :u and i.status = 'ATIVO' and i.finalidade = 'VENDA' and i.aceita_financiamento
                order by f.criado_em desc limit :limite
                """).param("u", usuarioId).param("limite", limite).query(Long.class).list();
    }
}
