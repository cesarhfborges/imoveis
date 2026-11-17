package br.com.chfb.imoveis.listing.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.listing.dto.FinanceiraDto;
import br.com.chfb.imoveis.listing.dto.FinanceiraForm;
import br.com.chfb.imoveis.listing.service.FinanceiraService;
import jakarta.validation.Valid;

/**
 * Financeiras: cadastro em {@code /app/admin/financeiras} (ADMIN) e lista das ativas em
 * {@code /app/public/financeiras} (formulário do anúncio e simulação).
 */
@RestController
public class FinanceiraController {

    private final FinanceiraService financeiras;

    public FinanceiraController(FinanceiraService financeiras) {
        this.financeiras = financeiras;
    }

    @GetMapping("/app/public/financeiras")
    public List<FinanceiraDto> ativas() {
        return financeiras.ativas();
    }

    @GetMapping("/app/admin/financeiras")
    public List<FinanceiraDto> listar() {
        return financeiras.listar();
    }

    @PostMapping("/app/admin/financeiras")
    @ResponseStatus(HttpStatus.CREATED)
    public FinanceiraDto criar(@Valid @RequestBody FinanceiraForm form) {
        return financeiras.criar(form);
    }

    @PutMapping("/app/admin/financeiras/{id}")
    public FinanceiraDto atualizar(@PathVariable Long id, @Valid @RequestBody FinanceiraForm form) {
        return financeiras.atualizar(id, form);
    }

    @DeleteMapping("/app/admin/financeiras/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        financeiras.excluir(id);
    }
}
