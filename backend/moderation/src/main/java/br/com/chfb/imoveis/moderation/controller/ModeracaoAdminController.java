package br.com.chfb.imoveis.moderation.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.AcaoImovelForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ConfigDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ContadorDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DecisaoForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.DenunciaDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ApuracaoForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GravidadeDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GravidadeForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.GrupoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ProcedenteForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.ReaberturaForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.MensagemAdminForm;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.PendenciasImovelDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoDto;
import br.com.chfb.imoveis.moderation.dto.ModeracaoDtos.TipoForm;
import br.com.chfb.imoveis.moderation.service.AutomacaoService;
import br.com.chfb.imoveis.moderation.service.DenunciaService;
import br.com.chfb.imoveis.moderation.service.RegrasService;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import jakarta.validation.Valid;

/** Moderação (só administradores): denúncias agrupadas por anúncio, decisões, regras e tipos. */
@RestController
@RequestMapping("/app/admin/moderacao")
public class ModeracaoAdminController {

    private final DenunciaService denuncias;
    private final RegrasService regras;
    private final AutomacaoService automacao;

    public ModeracaoAdminController(DenunciaService denuncias, RegrasService regras, AutomacaoService automacao) {
        this.denuncias = denuncias;
        this.regras = regras;
        this.automacao = automacao;
    }

    @GetMapping("/denuncias")
    public PageResponse<GrupoDto> listar(@RequestParam(defaultValue = "ABERTAS") String filtro,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return denuncias.gruposAdmin(filtro, page, size);
    }

    @GetMapping("/denuncias/contador")
    public ContadorDto contador() {
        return denuncias.contadorAdmin();
    }

    @GetMapping("/imoveis/{imovelId}")
    public PendenciasImovelDto doImovel(@PathVariable Long imovelId) {
        return denuncias.pendenciasAdmin(imovelId);
    }

    @PostMapping("/imoveis/{imovelId}/acao")
    public PendenciasImovelDto acao(@PathVariable Long imovelId, @Valid @RequestBody AcaoImovelForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.acaoNoImovel(imovelId, form, u);
    }

    @PostMapping("/denuncias/{id}/mensagens")
    public DenunciaDto mensagem(@PathVariable Long id, @Valid @RequestBody MensagemAdminForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.mensagemAdmin(id, form, u);
    }

    @PostMapping("/denuncias/{id}/aprovar")
    public DenunciaDto aprovar(@PathVariable Long id, @Valid @RequestBody(required = false) DecisaoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.aprovar(id, form, u);
    }

    @PostMapping("/denuncias/{id}/improcedente")
    public DenunciaDto improcedente(@PathVariable Long id, @Valid @RequestBody(required = false) DecisaoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.improcedente(id, form, u);
    }

    /** Abre a apuração (a empresa vai verificar): o prazo do anunciante para. */
    @PostMapping("/denuncias/{id}/apuracao")
    public DenunciaDto apuracao(@PathVariable Long id, @Valid @RequestBody ApuracaoForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.abrirApuracao(id, form, u);
    }

    /** A denúncia procede: aplica a medida no anúncio e conta para o banimento automático da conta. */
    @PostMapping("/denuncias/{id}/procedente")
    public DenunciaDto procedente(@PathVariable Long id, @Valid @RequestBody ProcedenteForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.procedente(id, form, u);
    }

    /** Revê um julgamento encerrado: a denúncia volta para análise, sem julgamento. */
    @PostMapping("/denuncias/{id}/reabrir")
    public DenunciaDto reabrir(@PathVariable Long id, @Valid @RequestBody ReaberturaForm form,
            @AuthenticationPrincipal AuthUser u) {
        return denuncias.reabrir(id, form, u);
    }

    /** Roda a passada da automação agora (sem esperar o próximo minuto). */
    @PostMapping("/automacao/processar")
    public Map<String, Integer> processarAgora() {
        return Map.of("acoes", automacao.processar());
    }

    // ------------------------------------------------------------------ regras

    @GetMapping("/config")
    public ConfigDto config() {
        return regras.obterConfig();
    }

    @PutMapping("/config")
    public ConfigDto salvarConfig(@Valid @RequestBody ConfigDto form) {
        return regras.salvarConfig(form);
    }

    @GetMapping("/gravidades")
    public List<GravidadeDto> gravidades() {
        return regras.gravidades();
    }

    @PostMapping("/gravidades")
    @ResponseStatus(HttpStatus.CREATED)
    public GravidadeDto criarGravidade(@Valid @RequestBody GravidadeForm form) {
        return regras.salvarGravidade(null, form);
    }

    @PutMapping("/gravidades/{id}")
    public GravidadeDto atualizarGravidade(@PathVariable Long id, @Valid @RequestBody GravidadeForm form) {
        return regras.salvarGravidade(id, form);
    }

    @DeleteMapping("/gravidades/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirGravidade(@PathVariable Long id) {
        regras.excluirGravidade(id);
    }

    @GetMapping("/tipos")
    public List<TipoDto> tipos() {
        return regras.tipos();
    }

    @PostMapping("/tipos")
    @ResponseStatus(HttpStatus.CREATED)
    public TipoDto criarTipo(@Valid @RequestBody TipoForm form) {
        return regras.salvarTipo(null, form);
    }

    @PutMapping("/tipos/{id}")
    public TipoDto atualizarTipo(@PathVariable Long id, @Valid @RequestBody TipoForm form) {
        return regras.salvarTipo(id, form);
    }

    @DeleteMapping("/tipos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirTipo(@PathVariable Long id) {
        regras.excluirTipo(id);
    }
}
