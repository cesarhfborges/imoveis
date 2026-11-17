package br.com.chfb.imoveis.listing.service;

import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.ClientePainel;
import br.com.chfb.imoveis.listing.dto.ClientePainel.AtividadeMes;
import br.com.chfb.imoveis.listing.dto.ClientePainel.Financiavel;
import br.com.chfb.imoveis.listing.dto.ClientePainel.Novidades;
import br.com.chfb.imoveis.listing.dto.ClientePainel.QuedaPreco;
import br.com.chfb.imoveis.listing.dto.ImovelDetalhe;
import br.com.chfb.imoveis.listing.dto.ImovelResumo;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.repository.AtividadeClienteRepository;
import br.com.chfb.imoveis.listing.repository.FavoritoRepository;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider.AnuncianteInfo;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Painel da conta do cliente: atividade, recomendações, quedas de preço e favoritos financiáveis. */
@Service
public class ContaPainelService {

    private static final int MESES = 12;
    private static final Duration NOVIDADE = Duration.ofDays(7);

    private final AtividadeClienteRepository atividade;
    private final ImovelRepository imoveis;
    private final ImovelService imovelService;
    private final FinanceiraService financeiras;
    private final AnuncianteProvider anunciantes;
    private final RecursosSitePolicy recursos;
    private final FavoritoRepository favoritos;

    /** Máximo de imóveis lado a lado na comparação. */
    public static final int MAX_COMPARACAO = 4;

    public ContaPainelService(AtividadeClienteRepository atividade, ImovelRepository imoveis,
            ImovelService imovelService, FinanceiraService financeiras, AnuncianteProvider anunciantes,
            RecursosSitePolicy recursos, FavoritoRepository favoritos) {
        this.atividade = atividade;
        this.imoveis = imoveis;
        this.imovelService = imovelService;
        this.financeiras = financeiras;
        this.anunciantes = anunciantes;
        this.recursos = recursos;
        this.favoritos = favoritos;
    }

    /**
     * Detalhes completos dos favoritos escolhidos para comparar (só os que são favoritos do próprio usuário,
     * na ordem pedida, até {@link #MAX_COMPARACAO}). Não conta visualização.
     */
    @Transactional(readOnly = true)
    public List<ImovelDetalhe> comparar(AuthUser u, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        Set<Long> meus = new HashSet<>(favoritos.idsFavoritos(u.id()));
        List<Long> validos = ids.stream().filter(Objects::nonNull).distinct().filter(meus::contains).limit(MAX_COMPARACAO).toList();
        return carregar(validos).stream().map(i -> imovelService.detalheSemVisita(i, u)).toList();
    }

    @Transactional(readOnly = true)
    public ClientePainel painel(AuthUser u) {
        Long id = u.id();
        long[] contatos = atividade.contatosEnviados(id);

        List<String[]> bairros = atividade.bairrosFavoritos(id, 3);
        Novidades novidades = new Novidades(bairros.stream().map(b -> b[0] + " (" + b[1] + ")").toList(),
                resumos(atividade.novidades(id, bairros, Instant.now().minus(NOVIDADE), 6)));

        List<Financiavel> financiaveis = new ArrayList<>();
        for (Imovel i : carregar(atividade.favoritosFinanciaveis(id, 6))) {
            var lista = financeiras.doAnuncio(i);
            if (!lista.isEmpty()) {
                financiaveis.add(new Financiavel(imovelService.resumo(i), lista));
            }
        }

        return new ClientePainel(contatos[0], contatos[1], atividadePorMes(id), atividade.contatosRecentes(id, 5),
                resumos(atividade.vistosRecentes(id, 8)), resumos(atividade.recomendados(id, 6)), novidades,
                quedas(u), financiaveis);
    }

    @Transactional(readOnly = true)
    public List<QuedaPreco> quedas(AuthUser u) {
        // com a regra desligada o histórico continua sendo gravado; só o aviso deixa de aparecer
        return recursos.alertaQuedaPreco() ? atividade.quedasNosFavoritos(u.id()) : List.of();
    }

    private List<AtividadeMes> atividadePorMes(Long usuarioId) {
        YearMonth atual = YearMonth.now(PainelService.FUSO);
        YearMonth inicio = atual.minusMonths(MESES - 1L);
        Instant desde = inicio.atDay(1).atStartOfDay(PainelService.FUSO).toInstant();
        String fuso = PainelService.FUSO.getId();
        Map<String, Long> fav = atividade.porMes("favoritos", usuarioId, desde, fuso);
        Map<String, Long> cont = atividade.porMes("contatos", usuarioId, desde, fuso);
        List<AtividadeMes> lista = new ArrayList<>();
        for (YearMonth m = inicio; !m.isAfter(atual); m = m.plusMonths(1)) {
            String chave = m.toString();
            lista.add(new AtividadeMes(chave, fav.getOrDefault(chave, 0L), cont.getOrDefault(chave, 0L)));
        }
        return lista;
    }

    /** Carrega os anúncios mantendo a ordem dos ids. */
    private List<Imovel> carregar(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Imovel> porId = imoveis.findAllById(ids).stream().collect(Collectors.toMap(Imovel::getId, Function.identity()));
        return ids.stream().map(porId::get).filter(Objects::nonNull).toList();
    }

    private List<ImovelResumo> resumos(List<Long> ids) {
        List<Imovel> lista = carregar(ids);
        Map<Long, AnuncianteInfo> nomes = anunciantes.buscarTodos(lista.stream().map(Imovel::getAnuncianteId).distinct().toList());
        return lista.stream().map(i -> imovelService.resumo(i, nomes.get(i.getAnuncianteId()))).toList();
    }
}
