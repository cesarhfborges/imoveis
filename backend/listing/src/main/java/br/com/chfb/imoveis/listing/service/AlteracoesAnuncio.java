package br.com.chfb.imoveis.listing.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.sharedkernel.event.AnuncioEditadoEvent.Alteracao;

/**
 * Retrato legível de um anúncio, para comparar antes e depois de uma edição. Cada campo vira texto já
 * formatado (moeda, m², sim/não), assim a moderação lê "Endereço: Rua A → Rua B" sem interpretar dados.
 */
final class AlteracoesAnuncio {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    /** Textos longos (descrição) são cortados no registro. */
    private static final int MAX_TEXTO = 2000;

    private final Map<String, String> campos;
    private final List<String> fotos;
    private final Set<String> caracteristicas;

    private AlteracoesAnuncio(Map<String, String> campos, List<String> fotos, Set<String> caracteristicas) {
        this.campos = campos;
        this.fotos = fotos;
        this.caracteristicas = caracteristicas;
    }

    static AlteracoesAnuncio retrato(Imovel i) {
        Map<String, String> c = new LinkedHashMap<>();
        c.put("Título", i.getTitulo());
        c.put("Finalidade", finalidade(i));
        c.put("Tipo", i.getTipo() == null ? null : i.getTipo().getDescricao());
        c.put("Preço", moeda(i.getPreco()));
        c.put("Condomínio", moeda(i.getCondominio()));
        c.put("IPTU", moeda(i.getIptu()));
        c.put("Área útil", area(i.getAreaUtil()));
        c.put("Área total", area(i.getAreaTotal()));
        c.put("Quartos", numero(i.getQuartos()));
        c.put("Suítes", numero(i.getSuites()));
        c.put("Banheiros", numero(i.getBanheiros()));
        c.put("Vagas", numero(i.getVagas()));
        c.put("Endereço", i.getEndereco());
        c.put("Bairro", i.getBairro());
        c.put("Cidade", i.getCidade());
        c.put("UF", i.getUf());
        c.put("CEP", i.getCep());
        c.put("Localização no mapa", i.getLatitude() == null || i.getLongitude() == null ? null
                : i.getLatitude().stripTrailingZeros().toPlainString() + ", " + i.getLongitude().stripTrailingZeros().toPlainString());
        c.put("Lançamento", simNao(i.isLancamento()));
        c.put("Aceita financiamento", simNao(i.isAceitaFinanciamento()));
        c.put("Aceita FGTS", simNao(i.isAceitaFgts()));
        c.put("Aceita permuta", simNao(i.isAceitaPermuta()));
        c.put("Escritura registrada", simNao(i.isEscrituraRegistrada()));
        c.put("Quitado", simNao(i.isQuitado()));
        c.put("Descrição", cortar(i.getDescricao()));
        return new AlteracoesAnuncio(c, i.getFotos().stream().map(FotoImovel::getUrl).toList(),
                new LinkedHashSet<>(i.getCaracteristicas()));
    }

    /** O que mudou de {@code this} (antes) para {@code depois}, na ordem dos campos do formulário. */
    List<Alteracao> comparar(AlteracoesAnuncio depois) {
        List<Alteracao> lista = new ArrayList<>();
        campos.forEach((campo, antes) -> {
            String novo = depois.campos.get(campo);
            if (!Objects.equals(vazioNulo(antes), vazioNulo(novo))) {
                lista.add(new Alteracao(campo, vazioNulo(antes), vazioNulo(novo)));
            }
        });
        if (!caracteristicas.equals(depois.caracteristicas)) {
            Set<String> novas = new LinkedHashSet<>(depois.caracteristicas);
            novas.removeAll(caracteristicas);
            Set<String> removidas = new LinkedHashSet<>(caracteristicas);
            removidas.removeAll(depois.caracteristicas);
            lista.add(new Alteracao("Características",
                    removidas.isEmpty() ? null : "Removidas: " + String.join(", ", removidas),
                    novas.isEmpty() ? null : "Adicionadas: " + String.join(", ", novas)));
        }
        if (!fotos.equals(depois.fotos)) {
            long novas = depois.fotos.stream().filter(f -> !fotos.contains(f)).count();
            long removidas = fotos.stream().filter(f -> !depois.fotos.contains(f)).count();
            List<String> partes = new ArrayList<>();
            if (novas > 0) partes.add(novas + (novas == 1 ? " nova" : " novas"));
            if (removidas > 0) partes.add(removidas + (removidas == 1 ? " removida" : " removidas"));
            if (partes.isEmpty()) partes.add("ordem alterada");
            else if (!depois.fotos.isEmpty() && !fotos.isEmpty() && !depois.fotos.get(0).equals(fotos.get(0))) partes.add("capa trocada");
            lista.add(new Alteracao("Fotos", quantidade(fotos.size()),
                    quantidade(depois.fotos.size()) + " (" + String.join(", ", partes) + ")"));
        }
        return lista;
    }

    private static String quantidade(int n) {
        return n == 0 ? "Nenhuma foto" : n == 1 ? "1 foto" : n + " fotos";
    }

    private static String finalidade(Imovel i) {
        if (i.getFinalidade() == null) return null;
        return switch (i.getFinalidade()) {
            case VENDA -> "Venda";
            case ALUGUEL -> "Aluguel";
            case TEMPORADA -> "Temporada";
        };
    }

    private static String moeda(BigDecimal v) {
        return v == null ? null : NumberFormat.getCurrencyInstance(PT_BR).format(v);
    }

    private static String area(BigDecimal v) {
        return v == null ? null : NumberFormat.getNumberInstance(PT_BR).format(v) + " m²";
    }

    private static String numero(Integer v) {
        return v == null ? null : v.toString();
    }

    private static String simNao(boolean v) {
        return v ? "Sim" : "Não";
    }

    private static String cortar(String s) {
        if (s == null) return null;
        String t = s.strip();
        return t.length() <= MAX_TEXTO ? t : t.substring(0, MAX_TEXTO - 1) + "…";
    }

    private static String vazioNulo(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
