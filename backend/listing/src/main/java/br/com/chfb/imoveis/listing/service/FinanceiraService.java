package br.com.chfb.imoveis.listing.service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.FinanceiraDto;
import br.com.chfb.imoveis.listing.dto.FinanceiraForm;
import br.com.chfb.imoveis.listing.entity.Financeira;
import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.repository.FinanceiraRepository;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;

/** Cadastro de financeiras (administração) e quais valem para cada anúncio. */
@Service
public class FinanceiraService {

    private final FinanceiraRepository financeiras;
    private final RecursosSitePolicy recursos;

    public FinanceiraService(FinanceiraRepository financeiras, RecursosSitePolicy recursos) {
        this.financeiras = financeiras;
        this.recursos = recursos;
    }

    @Transactional(readOnly = true)
    public List<FinanceiraDto> listar() {
        return financeiras.findAllByOrderByNomeAsc().stream().map(FinanceiraDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<FinanceiraDto> ativas() {
        return financeiras.findByAtivoTrueOrderByNomeAsc().stream().map(FinanceiraDto::of).toList();
    }

    @Transactional
    public FinanceiraDto criar(FinanceiraForm form) {
        Financeira f = new Financeira();
        aplicar(f, form);
        return FinanceiraDto.of(financeiras.save(f));
    }

    @Transactional
    public FinanceiraDto atualizar(Long id, FinanceiraForm form) {
        Financeira f = carregar(id);
        aplicar(f, form);
        return FinanceiraDto.of(financeiras.save(f));
    }

    /** Exclui a financeira; os anúncios que a tinham selecionado deixam de oferecê-la. */
    @Transactional
    public void excluir(Long id) {
        financeiras.delete(carregar(id));
    }

    /** Busca as financeiras escolhidas no formulário do anúncio (ignora ids inexistentes). */
    @Transactional(readOnly = true)
    public List<Financeira> porIds(Collection<Long> ids) {
        return ids == null || ids.isEmpty() ? List.of() : financeiras.findAllById(ids);
    }

    /**
     * Financeiras oferecidas na simulação do anúncio: só para venda que aceita financiamento, e apenas as ativas
     * (todas, ou as selecionadas pelo anunciante), e só com a regra "simulação de financiamento" ligada.
     * Lista vazia = não mostra o botão de simular.
     */
    @Transactional(readOnly = true)
    public List<FinanceiraDto> doAnuncio(Imovel i) {
        if (!i.isAceitaFinanciamento() || i.getFinalidade() != Finalidade.VENDA || !recursos.simulacaoFinanciamento()) {
            return List.of();
        }
        List<Financeira> lista = i.isFinanceirasTodas() ? financeiras.findByAtivoTrueOrderByNomeAsc()
                : i.getFinanceiras().stream().filter(Financeira::isAtivo)
                        .sorted(Comparator.comparing(Financeira::getNome, String.CASE_INSENSITIVE_ORDER)).toList();
        return lista.stream().map(FinanceiraDto::of).toList();
    }

    private Financeira carregar(Long id) {
        return financeiras.findById(id).orElseThrow(() -> new NotFoundException("Financeira não encontrada"));
    }

    private static void aplicar(Financeira f, FinanceiraForm form) {
        if (form.valorMinimoImovel() != null && form.valorMaximoImovel() != null
                && form.valorMinimoImovel().compareTo(form.valorMaximoImovel()) > 0) {
            throw new BusinessException(400, "O valor mínimo do imóvel não pode ser maior que o máximo");
        }
        f.setNome(form.nome().trim());
        f.setDescricao(vazioComoNulo(form.descricao()));
        f.setLogoUrl(vazioComoNulo(form.logoUrl()));
        f.setAtivo(form.ativo());
        f.setSistemaAmortizacao(form.sistemaAmortizacao());
        f.setTaxaJurosAnual(form.taxaJurosAnual());
        f.setPrazoMaximoMeses(form.prazoMaximoMeses());
        f.setEntradaMinimaPercentual(form.entradaMinimaPercentual());
        f.setComprometimentoRendaPercentual(form.comprometimentoRendaPercentual());
        f.setIdadeMaximaQuitacao(form.idadeMaximaQuitacao());
        f.setValorMinimoImovel(form.valorMinimoImovel());
        f.setValorMaximoImovel(form.valorMaximoImovel());
        f.setSeguroMensalPercentual(form.seguroMensalPercentual() == null ? BigDecimal.ZERO : form.seguroMensalPercentual());
        f.setTaxaAdministracaoMensal(form.taxaAdministracaoMensal() == null ? BigDecimal.ZERO : form.taxaAdministracaoMensal());
        f.setAceitaFgts(form.aceitaFgts());
        f.setObservacoes(vazioComoNulo(form.observacoes()));
    }

    private static String vazioComoNulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
