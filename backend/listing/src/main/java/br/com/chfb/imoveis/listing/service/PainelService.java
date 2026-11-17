package br.com.chfb.imoveis.listing.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.PainelAnuncios;
import br.com.chfb.imoveis.listing.dto.PainelAnuncios.Fatia;
import br.com.chfb.imoveis.listing.dto.PainelAnuncios.PontoDia;
import br.com.chfb.imoveis.listing.dto.PainelAnuncios.Resumo;
import br.com.chfb.imoveis.listing.dto.RelatorioAnuncio;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.listing.repository.PainelRepository;
import br.com.chfb.imoveis.listing.repository.PainelRepository.Agrupamento;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider.AnuncianteInfo;

/** Números e séries dos gráficos dos painéis (corretor: próprios anúncios; administração: todos). */
@Service
public class PainelService {

    /** Fuso usado para decidir "que dia é" uma visita ou um contato. */
    public static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    public static final Set<Integer> PERIODOS = Set.of(7, 30, 90);
    private static final int LIMITE_RANKING = 8;

    private final PainelRepository painel;
    private final ImovelRepository imoveis;
    private final AnuncianteProvider anunciantes;

    public PainelService(PainelRepository painel, ImovelRepository imoveis, AnuncianteProvider anunciantes) {
        this.painel = painel;
        this.imoveis = imoveis;
        this.anunciantes = anunciantes;
    }

    /** Chamado a cada abertura pública do anúncio, junto com o contador total. */
    @Transactional
    public void registrarVisita(Long imovelId) {
        painel.registrarVisita(imovelId, LocalDate.now(FUSO));
    }

    /**
     * @param anuncianteId nulo = todos os anúncios (administração)
     * @param dias         7, 30 ou 90 (outros valores viram 30)
     */
    @Transactional(readOnly = true)
    public PainelAnuncios painel(Long anuncianteId, int dias) {
        int periodo = PERIODOS.contains(dias) ? dias : 30;
        LocalDate hoje = LocalDate.now(FUSO);
        LocalDate inicio = hoje.minusDays(periodo - 1L);
        LocalDate inicioAnterior = inicio.minusDays(periodo);

        Map<LocalDate, Long> visitas = painel.visitasPorDia(anuncianteId, inicioAnterior, hoje);
        Map<LocalDate, Long> contatos = painel.contatosPorDia(anuncianteId,
                inicioAnterior.atStartOfDay(FUSO).toInstant(), FUSO.getId());
        Map<LocalDate, Long> novos = painel.anunciosNovosPorDia(anuncianteId,
                inicio.atStartOfDay(FUSO).toInstant(), FUSO.getId());

        List<PontoDia> serieVisitas = serie(visitas, inicio, hoje);
        List<PontoDia> serieContatos = serie(contatos, inicio, hoje);
        long anuncianteAtivos = anuncianteId == null ? imoveis.countByStatus(StatusAnuncio.ATIVO)
                : imoveis.countByAnuncianteIdAndStatus(anuncianteId, StatusAnuncio.ATIVO);
        long acumuladas = anuncianteId == null ? imoveis.somarVisualizacoes() : imoveis.somarVisualizacoes(anuncianteId);

        Resumo resumo = new Resumo(soma(serieVisitas), soma(serie(visitas, inicioAnterior, inicio.minusDays(1))),
                soma(serieContatos), soma(serie(contatos, inicioAnterior, inicio.minusDays(1))),
                painel.favoritos(anuncianteId), acumuladas, anuncianteAtivos);

        List<Object[]> porFinalidade = painel.visitasAgrupadas(anuncianteId, Agrupamento.FINALIDADE, 10);

        return new PainelAnuncios(periodo, resumo, serieVisitas, serieContatos, serie(novos, inicio, hoje),
                fatias(painel.visitasAgrupadas(anuncianteId, Agrupamento.CIDADE, LIMITE_RANKING), 1),
                fatias(painel.visitasAgrupadas(anuncianteId, Agrupamento.BAIRRO, LIMITE_RANKING), 1),
                fatias(painel.visitasAgrupadas(anuncianteId, Agrupamento.TIPO, 20), 1).stream()
                        .map(f -> new Fatia(descricaoTipo(f.rotulo()), f.total())).toList(),
                fatias(porFinalidade, 1).stream().map(f -> new Fatia(rotuloFinalidade(f.rotulo()), f.total())).toList(),
                fatias(porFinalidade, 2).stream().map(f -> new Fatia(rotuloFinalidade(f.rotulo()), f.total())).toList(),
                anuncianteId == null ? porAnunciante() : List.of(),
                painel.maisVistos(anuncianteId, LIMITE_RANKING));
    }

    /** Relatório de um anúncio (a permissão de quem pede é verificada em {@link ImovelService#relatorio}). */
    @Transactional(readOnly = true)
    public RelatorioAnuncio relatorio(Imovel imovel, int dias) {
        int periodo = PERIODOS.contains(dias) ? dias : 30;
        LocalDate hoje = LocalDate.now(FUSO);
        LocalDate inicio = hoje.minusDays(periodo - 1L);
        LocalDate inicioAnterior = inicio.minusDays(periodo);
        Instant desde = inicioAnterior.atStartOfDay(FUSO).toInstant();
        Long id = imovel.getId();

        Map<LocalDate, Long> visitas = painel.visitasDoImovel(id, inicioAnterior, hoje);
        Map<LocalDate, Long> contatos = painel.doImovelPorDia("contatos", id, desde, FUSO.getId());
        Map<LocalDate, Long> favoritos = painel.doImovelPorDia("favoritos", id, desde, FUSO.getId());
        LocalDate fimAnterior = inicio.minusDays(1);
        List<PontoDia> sv = serie(visitas, inicio, hoje), sc = serie(contatos, inicio, hoje), sf = serie(favoritos, inicio, hoje);
        RelatorioAnuncio.Resumo resumo = new RelatorioAnuncio.Resumo(soma(sv), soma(serie(visitas, inicioAnterior, fimAnterior)),
                soma(sc), soma(serie(contatos, inicioAnterior, fimAnterior)), soma(sf),
                soma(serie(favoritos, inicioAnterior, fimAnterior)));

        long[] outros = painel.outrosDoAnunciante(imovel.getAnuncianteId(), id, inicio, hoje,
                inicio.atStartOfDay(FUSO).toInstant(), hoje.plusDays(1).atStartOfDay(FUSO).toInstant());
        RelatorioAnuncio.Comparacao comparacao = outros[2] == 0 ? null
                : new RelatorioAnuncio.Comparacao(outros[0] / (double) outros[2], outros[1] / (double) outros[2], outros[2]);

        Instant criado = imovel.getCriadoEm();
        long diasNoAr = criado == null ? 0 : java.time.temporal.ChronoUnit.DAYS.between(criado.atZone(FUSO).toLocalDate(), hoje);
        RelatorioAnuncio.Anuncio anuncio = new RelatorioAnuncio.Anuncio(id, imovel.getCodigo(), imovel.getTitulo(),
                imovel.getStatus().name(), imovel.getPreco(), criado, diasNoAr, imovel.getVisualizacoes(),
                painel.favoritosDoImovel(id));
        return new RelatorioAnuncio(periodo, anuncio, resumo, comparacao, sv, sc, sf, painel.precos(id));
    }

    private List<Fatia> porAnunciante() {
        List<Object[]> linhas = painel.visitasAgrupadas(null, Agrupamento.ANUNCIANTE, LIMITE_RANKING);
        Map<Long, AnuncianteInfo> nomes = anunciantes.buscarTodos(
                linhas.stream().map(l -> Long.valueOf((String) l[0])).collect(Collectors.toSet()));
        return linhas.stream().map(l -> {
            AnuncianteInfo a = nomes.get(Long.valueOf((String) l[0]));
            return new Fatia(a != null ? a.nome() : "Anunciante #" + l[0], (Long) l[1]);
        }).toList();
    }

    /** Série contínua de {@code de} até {@code ate}, com zero nos dias sem registro. */
    static List<PontoDia> serie(Map<LocalDate, Long> valores, LocalDate de, LocalDate ate) {
        List<PontoDia> lista = new ArrayList<>();
        for (LocalDate d = de; !d.isAfter(ate); d = d.plusDays(1)) {
            lista.add(new PontoDia(d, valores.getOrDefault(d, 0L)));
        }
        return lista;
    }

    private static long soma(List<PontoDia> serie) {
        return serie.stream().mapToLong(PontoDia::total).sum();
    }

    private static List<Fatia> fatias(List<Object[]> linhas, int coluna) {
        return linhas.stream().map(l -> new Fatia((String) l[0], (Long) l[coluna])).toList();
    }

    private static String descricaoTipo(String tipo) {
        try {
            return TipoImovel.valueOf(tipo).getDescricao();
        } catch (IllegalArgumentException e) {
            return tipo;
        }
    }

    private static String rotuloFinalidade(String finalidade) {
        return switch (finalidade) {
            case "VENDA" -> "Venda";
            case "ALUGUEL" -> "Aluguel";
            case "TEMPORADA" -> "Temporada";
            default -> finalidade;
        };
    }
}
