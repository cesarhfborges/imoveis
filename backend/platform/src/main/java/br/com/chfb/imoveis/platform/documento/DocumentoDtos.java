package br.com.chfb.imoveis.platform.documento;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** DTOs dos documentos do site. */
public final class DocumentoDtos {

    private DocumentoDtos() {
    }

    /** Item da central pública e do rodapé. */
    public record DocumentoResumo(Long id, TipoDocumento tipo, String titulo, String slug, String resumo, int versao,
            Instant versaoEm) {
        static DocumentoResumo of(Documento d) {
            return new DocumentoResumo(d.getId(), d.getTipo(), d.getTitulo(), d.getSlug(), d.getResumo(), d.getVersao(),
                    d.getVersaoEm());
        }
    }

    /** Documento para leitura (site) ou para aceitar (cadastro e aviso de pendência). */
    public record DocumentoPublico(Long id, TipoDocumento tipo, String titulo, String slug, String resumo, String conteudo,
            int versao, Instant versaoEm) {
        static DocumentoPublico of(Documento d) {
            return new DocumentoPublico(d.getId(), d.getTipo(), d.getTitulo(), d.getSlug(), d.getResumo(), d.getConteudo(),
                    d.getVersao(), d.getVersaoEm());
        }
    }

    /** Visão da administração, com o total de aceites da versão atual. */
    public record DocumentoAdmin(Long id, TipoDocumento tipo, String titulo, String slug, String resumo, String conteudo,
            int versao, Instant versaoEm, boolean ativo, boolean publico, boolean aceiteCadastro, boolean aceiteContas,
            PerfilAceite aceitePerfil, int ordem, Instant excluidoEm, long aceitesVersaoAtual, long aceitesTotal,
            Instant atualizadoEm) {
    }

    public record DocumentoForm(
            @NotNull TipoDocumento tipo,
            @NotBlank @Size(max = 120) String titulo,
            @NotBlank @Size(max = 80) @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "Endereço inválido: use letras minúsculas, números e hífens") String slug,
            @Size(max = 300) String resumo,
            @Size(max = 500_000) String conteudo,
            boolean ativo,
            boolean publico,
            boolean aceiteCadastro,
            boolean aceiteContas,
            @NotNull PerfilAceite aceitePerfil,
            @Min(0) @Max(999) int ordem,
            /** Publica como nova versão: quem já aceitou precisa aceitar de novo. Falso = correção da versão atual. */
            boolean novaVersao,
            @Size(max = 300) String notaVersao) {
    }

    public record SituacaoForm(boolean ativo) {
    }

    public record VersaoResumo(int versao, String titulo, String nota, Instant publicadoEm, long aceites) {
    }

    public record VersaoDetalhe(int versao, String titulo, String conteudo, String nota, Instant publicadoEm) {
    }

    /** Aceite enviado pelo front: o documento e a versão que a pessoa leu. */
    public record AceiteItem(@NotNull Long documentoId, @Min(1) int versao) {
    }

    public record AceitesForm(@NotNull @Size(min = 1, max = 20) List<@Valid AceiteItem> itens) {
    }
}
