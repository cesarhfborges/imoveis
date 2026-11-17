package br.com.chfb.imoveis.platform.documento;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.platform.documento.DocumentoDtos.AceitesForm;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoAdmin;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoForm;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoPublico;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoResumo;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.SituacaoForm;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.VersaoDetalhe;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.VersaoResumo;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Documentos do site: leitura pública (/app/public), aceite do usuário logado (/app/conta) e cadastro
 * pela administração (/app/admin).
 */
@RestController
public class DocumentoController {

    private final DocumentoService documentos;

    public DocumentoController(DocumentoService documentos) {
        this.documentos = documentos;
    }

    // ---- site
    @GetMapping("/app/public/documentos")
    public List<DocumentoResumo> publicos() {
        return documentos.publicos();
    }

    @GetMapping("/app/public/documentos/cadastro")
    public List<DocumentoPublico> exigidosNoCadastro(@RequestParam(defaultValue = "CLIENTE") Perfil perfil) {
        return documentos.exigidosNoCadastro(perfil);
    }

    @GetMapping("/app/public/documentos/{slug}")
    public DocumentoPublico porSlug(@PathVariable String slug) {
        return documentos.porSlug(slug);
    }

    // ---- conta
    @GetMapping("/app/conta/documentos/pendentes")
    public List<DocumentoPublico> pendentes(@AuthenticationPrincipal AuthUser u) {
        return documentos.pendentes(u);
    }

    @PostMapping("/app/conta/documentos/aceites")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void aceitar(@Valid @RequestBody AceitesForm form, @AuthenticationPrincipal AuthUser u, HttpServletRequest http) {
        documentos.aceitar(u, form.itens(), http.getRemoteAddr());
    }

    // ---- administração
    @GetMapping("/app/admin/documentos")
    public List<DocumentoAdmin> listar(@RequestParam(defaultValue = "false") boolean excluidos) {
        return documentos.listarAdmin(excluidos);
    }

    @GetMapping("/app/admin/documentos/{id}")
    public DocumentoAdmin obter(@PathVariable Long id) {
        return documentos.obterAdmin(id);
    }

    @PostMapping("/app/admin/documentos")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentoAdmin criar(@Valid @RequestBody DocumentoForm form, @AuthenticationPrincipal AuthUser u) {
        return documentos.criar(form, u.id());
    }

    @PutMapping("/app/admin/documentos/{id}")
    public DocumentoAdmin atualizar(@PathVariable Long id, @Valid @RequestBody DocumentoForm form, @AuthenticationPrincipal AuthUser u) {
        return documentos.atualizar(id, form, u.id());
    }

    @PatchMapping("/app/admin/documentos/{id}/situacao")
    public DocumentoAdmin situacao(@PathVariable Long id, @RequestBody SituacaoForm form) {
        return documentos.situacao(id, form.ativo());
    }

    @DeleteMapping("/app/admin/documentos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        documentos.excluir(id);
    }

    @PostMapping("/app/admin/documentos/{id}/restaurar")
    public DocumentoAdmin restaurar(@PathVariable Long id) {
        return documentos.restaurar(id);
    }

    @GetMapping("/app/admin/documentos/{id}/versoes")
    public List<VersaoResumo> versoes(@PathVariable Long id) {
        return documentos.versoes(id);
    }

    @GetMapping("/app/admin/documentos/{id}/versoes/{versao}")
    public VersaoDetalhe versao(@PathVariable Long id, @PathVariable int versao) {
        return documentos.versao(id, versao);
    }
}
