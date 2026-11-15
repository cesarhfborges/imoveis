package br.com.chfb.imoveis.platform.aviso;

import java.time.Instant;
import java.util.Set;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** DTOs dos avisos do site. */
public final class AvisoDtos {

    private AvisoDtos() {
    }

    /**
     * O que o site recebe para exibir.
     *
     * @param versaoAceita usuário logado: a versão que ele aceitou (nula se nunca aceitou ou se é visitante)
     */
    public record AvisoPublicoDto(Long id, int versao, String titulo, String mensagem, TipoAviso tipo, String posicao,
            String severidade, String icone, boolean dispensavel, boolean modal, String textoAceite,
            AcaoAceite acaoAceite, String linkAceite, boolean novaAba, String textoLink, String urlLink, int ordem,
            Integer versaoAceita) {

        static AvisoPublicoDto of(Aviso a, Integer versaoAceita) {
            return new AvisoPublicoDto(a.getId(), a.getVersao(), a.getTitulo(), a.getMensagem(), a.getTipo(),
                    a.getPosicao(), a.getSeveridade(), a.getIcone(), a.isDispensavel(), a.isModal(), a.getTextoAceite(),
                    a.getAcaoAceite(), a.getLinkAceite(), a.isNovaAba(), a.getTextoLink(), a.getUrlLink(), a.getOrdem(),
                    versaoAceita);
        }
    }

    /** Cadastro completo (painel), com quantos usuários logados aceitaram a versão atual. */
    public record AvisoDto(Long id, String nome, String titulo, String mensagem, TipoAviso tipo, String posicao,
            String severidade, String icone, boolean dispensavel, boolean modal, String textoAceite,
            AcaoAceite acaoAceite, String linkAceite, boolean novaAba, String textoLink, String urlLink,
            PublicoAviso publico, Set<Aviso.Area> areas, boolean ativo, int ordem, Instant inicioEm, Instant fimEm,
            int versao, Instant versaoEm, long aceitesVersaoAtual, Instant atualizadoEm) {

        static AvisoDto of(Aviso a, long aceites) {
            return new AvisoDto(a.getId(), a.getNome(), a.getTitulo(), a.getMensagem(), a.getTipo(), a.getPosicao(),
                    a.getSeveridade(), a.getIcone(), a.isDispensavel(), a.isModal(), a.getTextoAceite(),
                    a.getAcaoAceite(), a.getLinkAceite(), a.isNovaAba(), a.getTextoLink(), a.getUrlLink(),
                    a.getPublico(), a.getAreasSet(), a.isAtivo(), a.getOrdem(), a.getInicioEm(), a.getFimEm(),
                    a.getVersao(), a.getVersaoEm(), aceites, a.getAtualizadoEm());
        }
    }

    /** Endereço interno ("/faq") ou externo (http/https). */
    private static final String URL = "^$|^(/[^\\s]*|https?://\\S+)$";

    /**
     * @param dispensavel pode ser fechado sem aceitar (volta na próxima sessão do navegador)
     * @param textoAceite botão principal (vazio: sem botão; aí o aviso precisa ser dispensável)
     * @param novaVersao  pedir confirmação de novo a todos, mesmo sem mudar o conteúdo
     */
    public record AvisoForm(@NotBlank @Size(max = 80) String nome, @Size(max = 120) String titulo,
            @NotBlank @Size(max = 20000) String mensagem, @NotNull TipoAviso tipo, @NotBlank @Size(max = 12) String posicao,
            @NotNull @Pattern(regexp = "info|success|warn|error|secondary|contrast") String severidade,
            @Pattern(regexp = "^$|^pi-[a-z0-9-]{1,36}$", message = "Ícone inválido") String icone,
            boolean dispensavel, boolean modal, @Size(max = 40) String textoAceite, @NotNull AcaoAceite acaoAceite,
            @Size(max = 500) @Pattern(regexp = URL, message = "Endereço inválido: use /pagina ou https://...") String linkAceite,
            boolean novaAba, @Size(max = 60) String textoLink,
            @Size(max = 500) @Pattern(regexp = URL, message = "Endereço inválido: use /pagina ou https://...") String urlLink,
            @NotNull PublicoAviso publico, @NotEmpty Set<Aviso.Area> areas, boolean ativo,
            @Min(0) @Max(100_000) int ordem, Instant inicioEm, Instant fimEm, boolean novaVersao) {
    }

    public record AceiteForm(@Min(1) int versao) {
    }
}
