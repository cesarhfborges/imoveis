package br.com.chfb.imoveis.moderation.dto;

import java.time.Instant;
import java.util.List;

import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.moderation.entity.AcaoAutomatica;
import br.com.chfb.imoveis.moderation.entity.Gravidade;
import br.com.chfb.imoveis.moderation.entity.MedidaAnuncio;
import br.com.chfb.imoveis.moderation.entity.Natureza;
import br.com.chfb.imoveis.moderation.entity.PapelMensagem;
import br.com.chfb.imoveis.moderation.entity.PenalidadeConta;
import br.com.chfb.imoveis.moderation.entity.StatusDenuncia;
import br.com.chfb.imoveis.moderation.entity.TipoDenuncia;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** DTOs da moderação. */
public final class ModeracaoDtos {

    private ModeracaoDtos() {
    }

    /** Teto de prazo: 1 ano em minutos. */
    private static final int MAX_MINUTOS = 525_600;

    // ------------------------------------------------------------------ gravidades

    /** Gravidade completa (cadastro), com a regra de banimento automático da conta. */
    public record GravidadeDto(Long id, String nome, String cor, int ordem, boolean ativo, boolean banirContaAuto,
            Integer banirApos, Integer janelaMeses) {

        public static GravidadeDto of(Gravidade g) {
            return new GravidadeDto(g.getId(), g.getNome(), g.getCor(), g.getOrdem(), g.isAtivo(), g.isBanirContaAuto(),
                    g.getBanirApos(), g.getJanelaMeses());
        }
    }

    /** Gravidade nas telas de denúncia: nome e cor da etiqueta. */
    public record GravidadeResumo(Long id, String nome, String cor) {

        public static GravidadeResumo of(Gravidade g) {
            return g == null ? null : new GravidadeResumo(g.getId(), g.getNome(), g.getCor());
        }
    }

    /**
     * @param banirApos   denúncias procedentes desta gravidade até o banimento automático da conta
     * @param janelaMeses considerar só as procedentes dos últimos N meses (nulo = todo o histórico)
     */
    public record GravidadeForm(@NotBlank @Size(max = 40) String nome,
            @NotNull @Pattern(regexp = "success|info|warn|danger|secondary|contrast") String cor,
            @Min(0) @Max(100_000) int ordem, boolean ativo, boolean banirContaAuto,
            @Min(1) @Max(1000) Integer banirApos, @Min(1) @Max(600) Integer janelaMeses) {
    }

    // ------------------------------------------------------------------ tipos e regras

    public record TipoDto(Long id, String nome, String descricao, GravidadeResumo gravidade, int slaMinutos,
            boolean suspenderAoAbrir, boolean ativo, int ordem) {

        public static TipoDto of(TipoDenuncia t) {
            return new TipoDto(t.getId(), t.getNome(), t.getDescricao(), GravidadeResumo.of(t.getGravidade()), t.getSlaMinutos(),
                    t.isSuspenderAoAbrir(), t.isAtivo(), t.getOrdem());
        }
    }

    /** O que o denunciante vê de um tipo (sem prazos nem regras internas). */
    public record TipoPublicoDto(Long id, String nome, String descricao) {

        public static TipoPublicoDto of(TipoDenuncia t) {
            return new TipoPublicoDto(t.getId(), t.getNome(), t.getDescricao());
        }
    }

    public record TipoForm(@NotBlank @Size(max = 80) String nome, @Size(max = 300) String descricao,
            @NotNull Long gravidadeId, @Min(1) @Max(MAX_MINUTOS) int slaMinutos, boolean suspenderAoAbrir,
            boolean ativo, @Min(0) @Max(100_000) int ordem) {
    }

    public record ConfigDto(boolean automacaoAtiva, boolean aprovarReativaAnuncio,
            @Min(1) @Max(MAX_MINUTOS) int ajusteSlaMinutos, @NotNull AcaoAutomatica etapa1Acao,
            @Min(1) @Max(MAX_MINUTOS) int etapa1PrazoMinutos, @NotNull AcaoAutomatica etapa2Acao,
            @Min(0) @Max(MAX_MINUTOS) int avisoMinutos, Instant atualizadoEm) {
    }

    // ------------------------------------------------------------------ denúncia

    public record DenunciaForm(@NotNull Long imovelId, @NotNull Long tipoId,
            @NotBlank @Size(min = 20, max = 500) String descricao) {
    }

    /**
     * Prazo do anunciante.
     *
     * @param minutosRestantes minutos úteis que faltam (0 se vencido; nulo se o prazo não está correndo)
     * @param correndoAgora    o relógio está andando agora (dentro do expediente)?
     * @param retomaEm         fora do expediente: quando o relógio volta a andar
     * @param minutosNaPausa   prazo parado (aguardando a moderação): quanto faltava quando parou
     */
    public record PrazoDto(Instant prazoEm, Integer slaMinutos, Long minutosRestantes, boolean vencido,
            boolean correndoAgora, Instant retomaEm, int etapa, Integer minutosNaPausa) {
    }

    /**
     * @param autorFoto foto de perfil do autor (nula: o front mostra as iniciais; para o anunciante, a moderação
     *                  aparece sempre como "Moderação", sem nome nem foto do administrador)
     */
    public record MensagemDto(Long id, PapelMensagem papel, String autor, String autorFoto, String texto,
            List<String> anexos, boolean interna, Instant criadoEm) {
    }

    public record ImovelInfo(Long id, String codigo, String titulo, StatusAnuncio status, String fotoCapa,
            String cidade, String bairro) {
    }

    /** Visão do denunciante: só a situação, sem a conversa. */
    public record MinhaDenunciaDto(Long id, ImovelInfo imovel, String tipo, String situacao, Instant criadoEm,
            Instant resolvidoEm) {
    }

    public record DenunciaResumo(Long id, String tipo, GravidadeResumo gravidade, StatusDenuncia status, PrazoDto prazo,
            Instant criadoEm) {
    }

    /**
     * Denúncia completa (anunciante: sem denunciante e sem notas internas).
     *
     * @param natureza        procedente: erro ou má-fé (nula: ainda não julgada procedente)
     * @param medida          procedente: o que foi feito com o anúncio (CORRIGIR: correção solicitada)
     * @param penalidade      procedente: consequência para a conta (só para administradores)
     * @param julgadoEm       quando foi julgada procedente
     * @param apuracaoPrazoEm em apuração: prazo interno da moderação (só para administradores)
     */
    public record DenunciaDto(Long id, TipoPublicoDto tipo, GravidadeResumo gravidade, String descricao,
            StatusDenuncia status, PrazoDto prazo, String denuncianteNome, String denuncianteEmail, Instant criadoEm,
            Instant resolvidoEm, String conclusao, Natureza natureza, MedidaAnuncio medida, PenalidadeConta penalidade,
            Instant julgadoEm, Instant apuracaoPrazoEm, List<MensagemDto> mensagens) {
    }

    /** Pendências de um anúncio (lista). */
    public record GrupoDto(ImovelInfo imovel, Long anuncianteId, String anuncianteNome, long abertas,
            long aguardandoAnunciante, long emAnalise, long emApuracao, Long menorMinutosRestantes, boolean algumVencido,
            Instant ultimaDenuncia, List<DenunciaResumo> denuncias) {
    }

    public record AnuncianteDto(Long id, String nome, String email, String telefone, String creci) {
    }

    /**
     * Histórico do anunciante: quantas denúncias dos anúncios dele terminaram em cada situação, a conta (ativa ou
     * banida) e, por gravidade, as procedentes e quanto falta para o banimento automático.
     */
    public record HistoricoDto(long total, long abertas, long resolvidas, long improcedentes, long procedentes,
            long procedentesMaFe, long banidas, boolean contaBanida, List<ProcedentesPorGravidade> porGravidade) {
    }

    /**
     * @param total    procedentes desta gravidade em todo o histórico
     * @param naJanela procedentes que contam para a regra (dentro da janela de meses)
     */
    public record ProcedentesPorGravidade(GravidadeResumo gravidade, long total, long naJanela, boolean banirContaAuto,
            Integer banirApos, Integer janelaMeses) {
    }

    /** Pendências de um anúncio (detalhe). */
    public record PendenciasImovelDto(ImovelInfo imovel, AnuncianteDto anunciante, HistoricoDto historico,
            List<DenunciaDto> denuncias) {
    }

    public record RespostaForm(@NotEmpty @Size(max = 50) List<@NotNull Long> denuncias,
            @NotBlank @Size(max = 20000) String texto, @Size(max = 10) List<@NotBlank @Size(max = 200) String> anexos) {
    }

    /**
     * Mensagem da moderação. Não interna: vai para o anunciante e, se a denúncia estava em análise, devolve o caso
     * a ele (o prazo retoma de onde parou). Interna: só administradores veem e nada muda no prazo.
     */
    public record MensagemAdminForm(@NotBlank @Size(max = 20000) String texto, boolean interna,
            @Size(max = 10) List<@NotBlank @Size(max = 200) String> anexos) {
    }

    public record DecisaoForm(@Size(max = 20000) String texto) {
    }

    /**
     * Abrir apuração (a empresa vai verificar, ex.: visita ao imóvel): o prazo do anunciante para.
     *
     * @param interna      a descrição fica só para administradores (o anunciante vê apenas que está em apuração)
     * @param prazoMinutos prazo interno opcional, em minutos úteis (só alerta a moderação)
     */
    public record ApuracaoForm(@NotBlank @Size(max = 20000) String texto, boolean interna,
            @Min(1) @Max(MAX_MINUTOS) Integer prazoMinutos) {
    }

    /**
     * Julgar a denúncia procedente (a qualquer momento, com ou sem resposta do anunciante; também serve para
     * alterar um julgamento procedente ainda aberto).
     *
     * @param medida               CORRIGIR deixa a denúncia aberta aguardando a correção; as outras encerram
     * @param penalidade           consequência para a conta (strike conta para o banimento automático da gravidade)
     * @param prazoMinutos         CORRIGIR: prazo da correção em minutos úteis (nulo: o prazo de ajuste das regras)
     * @param suspenderAteCorrigir CORRIGIR: tira o anúncio do ar até a correção ser aceita
     * @param notaInterna          opcional, só para administradores (ex.: o resultado da visita)
     */
    public record ProcedenteForm(@NotNull Natureza natureza, @NotNull MedidaAnuncio medida,
            @NotNull PenalidadeConta penalidade, @Min(1) @Max(MAX_MINUTOS) Integer prazoMinutos,
            boolean suspenderAteCorrigir, @NotBlank @Size(max = 20000) String conclusao,
            @Size(max = 20000) String notaInterna) {
    }

    /**
     * Rever um julgamento já encerrado: a denúncia volta a ficar em análise, sem julgamento (o strike sai da
     * contagem).
     *
     * @param motivo          por que o julgamento foi revisto (registrado na conversa)
     * @param reativarConta   a conta do anunciante estava banida: reativar
     * @param reativarAnuncio o anúncio estava suspenso ou removido: voltar ao ar
     */
    public record ReaberturaForm(@NotBlank @Size(max = 20000) String motivo, boolean reativarConta,
            boolean reativarAnuncio) {
    }

    public enum AcaoImovel {
        SUSPENDER, REATIVAR, BANIR
    }

    public record AcaoImovelForm(@NotNull AcaoImovel acao, @Size(max = 2000) String motivo) {
    }

    public record ContadorDto(long aguardandoVoce, long abertas) {
    }
}
