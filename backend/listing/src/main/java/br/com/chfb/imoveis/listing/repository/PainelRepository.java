package br.com.chfb.imoveis.listing.repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import br.com.chfb.imoveis.listing.dto.RelatorioAnuncio;
import br.com.chfb.imoveis.listing.dto.PainelAnuncios.Desempenho;

/**
 * Consultas de agregação dos painéis (SQL nativo, só leitura — exceto o registro da visita diária).
 * Em todas, {@code anuncianteId} nulo significa "todos os anúncios" (administração).
 */
@Repository
public class PainelRepository {

    private static final String FILTRO = " (cast(:anunciante as bigint) is null or i.anunciante_id = :anunciante) ";

    private final JdbcClient jdbc;

    public PainelRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Soma uma visita ao dia informado (cria a linha do dia na primeira visita). */
    public void registrarVisita(Long imovelId, LocalDate dia) {
        jdbc.sql("""
                insert into imovel_visitas_diarias (imovel_id, dia, total) values (:id, :dia, 1)
                on conflict (imovel_id, dia) do update set total = imovel_visitas_diarias.total + 1
                """).param("id", imovelId).param("dia", dia).update();
    }

    public Map<LocalDate, Long> visitasPorDia(Long anuncianteId, LocalDate inicio, LocalDate fim) {
        return porDia(jdbc.sql("""
                select v.dia, sum(v.total) from imovel_visitas_diarias v join imoveis i on i.id = v.imovel_id
                where v.dia between :inicio and :fim and""" + FILTRO + "group by v.dia")
                .param("inicio", inicio).param("fim", fim).param("anunciante", anuncianteId));
    }

    public Map<LocalDate, Long> contatosPorDia(Long anuncianteId, Instant inicio, String fuso) {
        return porDia(jdbc.sql("""
                select cast(c.criado_em at time zone :fuso as date), count(*) from contatos c
                join imoveis i on i.id = c.imovel_id
                where c.criado_em >= :inicio and""" + FILTRO + "group by 1")
                .param("fuso", fuso).param("inicio", java.sql.Timestamp.from(inicio)).param("anunciante", anuncianteId));
    }

    public Map<LocalDate, Long> anunciosNovosPorDia(Long anuncianteId, Instant inicio, String fuso) {
        return porDia(jdbc.sql("""
                select cast(i.criado_em at time zone :fuso as date), count(*) from imoveis i
                where i.criado_em >= :inicio and""" + FILTRO + "group by 1")
                .param("fuso", fuso).param("inicio", java.sql.Timestamp.from(inicio)).param("anunciante", anuncianteId));
    }

    /** Visualizações acumuladas agrupadas por uma coluna de {@code imoveis} (lista fixa, nunca vinda do usuário). */
    public List<Object[]> visitasAgrupadas(Long anuncianteId, Agrupamento por, int limite) {
        return jdbc.sql("select " + por.expressao + ", coalesce(sum(i.visualizacoes), 0), count(*) from imoveis i where"
                        + FILTRO + "group by " + por.expressao + " order by 2 desc, 3 desc limit :limite")
                .param("anunciante", anuncianteId).param("limite", limite)
                .query((rs, n) -> new Object[] {rs.getString(1), rs.getLong(2), rs.getLong(3)}).list();
    }

    public long contatosEntre(Long anuncianteId, Instant inicio, Instant fim) {
        return jdbc.sql("select count(*) from contatos c join imoveis i on i.id = c.imovel_id"
                        + " where c.criado_em >= :inicio and c.criado_em < :fim and" + FILTRO)
                .param("inicio", java.sql.Timestamp.from(inicio)).param("fim", java.sql.Timestamp.from(fim))
                .param("anunciante", anuncianteId).query(Long.class).single();
    }

    public long favoritos(Long anuncianteId) {
        return jdbc.sql("select count(*) from favoritos f join imoveis i on i.id = f.imovel_id where" + FILTRO)
                .param("anunciante", anuncianteId).query(Long.class).single();
    }

    public List<Desempenho> maisVistos(Long anuncianteId, int limite) {
        return jdbc.sql("""
                select i.id, i.titulo, i.bairro, i.cidade, i.status, i.visualizacoes,
                       (select count(*) from contatos c where c.imovel_id = i.id),
                       (select count(*) from favoritos f where f.imovel_id = i.id)
                from imoveis i where""" + FILTRO + "order by i.visualizacoes desc, i.id desc limit :limite")
                .param("anunciante", anuncianteId).param("limite", limite)
                .query((rs, n) -> new Desempenho(rs.getLong(1), String.format("IM-%06d", rs.getLong(1)),
                        rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getLong(6),
                        rs.getLong(7), rs.getLong(8)))
                .list();
    }

    // ------------------------------------------------------------------ relatório de um anúncio

    public Map<LocalDate, Long> visitasDoImovel(Long imovelId, LocalDate inicio, LocalDate fim) {
        return porDia(jdbc.sql("select dia, total from imovel_visitas_diarias where imovel_id = :i and dia between :inicio and :fim")
                .param("i", imovelId).param("inicio", inicio).param("fim", fim));
    }

    /** Contatos ou favoritos ({@code tabela}) do imóvel por dia, a partir de {@code inicio}. */
    public Map<LocalDate, Long> doImovelPorDia(String tabela, Long imovelId, Instant inicio, String fuso) {
        if (!tabela.equals("contatos") && !tabela.equals("favoritos")) {
            throw new IllegalArgumentException(tabela);
        }
        return porDia(jdbc.sql("select cast(criado_em at time zone :fuso as date), count(*) from " + tabela
                        + " where imovel_id = :i and criado_em >= :inicio group by 1")
                .param("fuso", fuso).param("i", imovelId).param("inicio", java.sql.Timestamp.from(inicio)));
    }

    public long favoritosDoImovel(Long imovelId) {
        return jdbc.sql("select count(*) from favoritos where imovel_id = :i").param("i", imovelId).query(Long.class).single();
    }

    /**
     * Soma de visitas e de contatos dos <b>outros</b> anúncios ativos do anunciante no período, e quantos são:
     * [visitas, contatos, anúncios].
     */
    public long[] outrosDoAnunciante(Long anuncianteId, Long imovelId, LocalDate inicio, LocalDate fim, Instant inicioInstante,
            Instant fimInstante) {
        return jdbc.sql("""
                select coalesce((select sum(v.total) from imovel_visitas_diarias v join imoveis i on i.id = v.imovel_id
                                  where i.anunciante_id = :a and i.id <> :i and i.status = 'ATIVO' and v.dia between :inicio and :fim), 0),
                       (select count(*) from contatos c join imoveis i on i.id = c.imovel_id
                         where i.anunciante_id = :a and i.id <> :i and i.status = 'ATIVO'
                           and c.criado_em >= :ini and c.criado_em < :fimi),
                       (select count(*) from imoveis i where i.anunciante_id = :a and i.id <> :i and i.status = 'ATIVO')
                """).param("a", anuncianteId).param("i", imovelId).param("inicio", inicio).param("fim", fim)
                .param("ini", java.sql.Timestamp.from(inicioInstante)).param("fimi", java.sql.Timestamp.from(fimInstante))
                .query((rs, n) -> new long[] {rs.getLong(1), rs.getLong(2), rs.getLong(3)}).single();
    }

    public List<RelatorioAnuncio.MudancaPreco> precos(Long imovelId) {
        return jdbc.sql("select alterado_em, preco_anterior, preco_novo from imovel_precos where imovel_id = :i order by alterado_em desc")
                .param("i", imovelId)
                .query((rs, n) -> new RelatorioAnuncio.MudancaPreco(rs.getTimestamp(1).toInstant(), rs.getBigDecimal(2), rs.getBigDecimal(3)))
                .list();
    }

    private static Map<LocalDate, Long> porDia(JdbcClient.StatementSpec sql) {
        Map<LocalDate, Long> mapa = new HashMap<>();
        sql.query(rs -> {
            mapa.put(rs.getDate(1).toLocalDate(), rs.getLong(2));
        });
        return mapa;
    }

    /** Colunas permitidas para agrupar (evita SQL montado com texto externo). */
    public enum Agrupamento {
        CIDADE("i.cidade || '/' || i.uf"),
        BAIRRO("i.bairro || ' (' || i.cidade || ')'"),
        TIPO("i.tipo"),
        FINALIDADE("i.finalidade"),
        ANUNCIANTE("cast(i.anunciante_id as varchar)");

        final String expressao;

        Agrupamento(String expressao) {
            this.expressao = expressao;
        }
    }
}
