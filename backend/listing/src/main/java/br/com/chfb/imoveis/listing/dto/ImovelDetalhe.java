package br.com.chfb.imoveis.listing.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import br.com.chfb.imoveis.listing.entity.CondicaoAnuncio;
import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;

/** Dados completos de um anúncio (página do imóvel e edição). */
public record ImovelDetalhe(
        Long id,
        String codigo,
        String titulo,
        String descricao,
        Finalidade finalidade,
        TipoImovel tipo,
        String tipoDescricao,
        StatusAnuncio status,
        BigDecimal preco,
        BigDecimal condominio,
        BigDecimal iptu,
        BigDecimal areaUtil,
        BigDecimal areaTotal,
        Integer quartos,
        Integer suites,
        Integer banheiros,
        Integer vagas,
        String uf,
        String cidade,
        String bairro,
        String endereco,
        String numero,
        String cep,
        BigDecimal latitude,
        BigDecimal longitude,
        boolean lancamento,
        boolean destaque,
        boolean aceitaFinanciamento,
        boolean aceitaFgts,
        boolean aceitaPermuta,
        boolean escrituraRegistrada,
        boolean quitado,
        /** Condições específicas da finalidade (aluguel/temporada e extras de venda). */
        Set<CondicaoAnuncio> condicoes,
        Integer contratoMinimoMeses,
        Integer noitesMinimas,
        Integer hospedesMaximo,
        BigDecimal taxaLimpeza,
        String horarioCheckin,
        String horarioCheckout,
        boolean financeirasTodas,
        /** Financeiras selecionadas no formulário (edição). */
        List<Long> financeirasIds,
        /** Financeiras ativas oferecidas na simulação (vazio = sem simulação). */
        List<FinanceiraDto> financeiras,
        List<FotoDto> fotos,
        Set<String> caracteristicas,
        long visualizacoes,
        Anunciante anunciante,
        Instant criadoEm,
        Instant atualizadoEm) {

    /**
     * telefone: só dígitos. Com telefoneCompleto = false vem só o início (DDD e primeira parte, ex.: "6199999"):
     * o número inteiro sai em GET /{id}/telefone, para quem está logado.
     */
    public record Anunciante(Long id, String nome, String telefone, boolean telefoneCompleto, String creci, String fotoUrl,
            boolean perfilPublico) {
    }
}
