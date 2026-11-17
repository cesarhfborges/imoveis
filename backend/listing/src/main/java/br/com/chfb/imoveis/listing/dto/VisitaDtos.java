package br.com.chfb.imoveis.listing.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import br.com.chfb.imoveis.listing.entity.StatusVisita;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Agendamento de visitas. */
public final class VisitaDtos {

    private VisitaDtos() {
    }

    /** Horários livres de um dia. */
    public record DiaHorarios(LocalDate dia, List<Instant> horarios) {
    }

    /**
     * @param pessoa quem está do outro lado: o cliente (para o anunciante) ou o anunciante (para o cliente)
     */
    public record VisitaDto(Long id, Long imovelId, String imovelCodigo, String imovelTitulo, String bairro, String cidade,
            String fotoCapa, Instant inicio, Instant fim, StatusVisita status, String mensagem, String resposta,
            Instant propostoInicio, Pessoa pessoa, Instant criadoEm) {
    }

    public record Pessoa(Long id, String nome, String email, String telefone) {
    }

    public record VisitaForm(@NotNull Long imovelId, @NotNull Instant inicio, @Size(max = 1000) String mensagem) {
    }

    /** Recado opcional (motivo da recusa ou do cancelamento). */
    public record RecadoForm(@Size(max = 1000) String mensagem) {
    }

    public record PropostaForm(@NotNull Instant inicio, @Size(max = 1000) String mensagem) {
    }
}
