package br.com.chfb.imoveis.coreapi.dto;

import java.time.Instant;
import java.util.Set;

import br.com.chfb.imoveis.coreapi.entity.ApiToken;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** DTOs da conta do usuário, gestão de usuários e tokens de API. */
public final class ContaDtos {

    private ContaDtos() {
    }

    public record PerfilForm(@NotBlank @Size(max = 120) String nome, @Size(max = 30) String telefone,
            @Size(max = 30) String creci, @Size(max = 500) String fotoUrl) {
    }

    public record SenhaForm(@NotBlank String senhaAtual, @NotBlank @Size(min = 8, max = 72) String novaSenha) {
    }

    public record UsuarioDto(Long id, String nome, String email, String telefone, String creci, String documento,
            String tipoAnunciante, String fotoUrl, boolean ativo, Set<Perfil> papeis, Set<Perfil> perfisPermitidos, Instant ultimoAcesso, Instant criadoEm) {

        public static UsuarioDto of(Usuario u) {
            return new UsuarioDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getCreci(), u.getDocumento(),
                    u.getTipoAnunciante(), u.getFotoUrl(),
                    u.isAtivo(), Set.copyOf(u.getPapeis()), u.perfisPermitidos(), u.getUltimoAcesso(), u.getCriadoEm());
        }
    }

    public record UsuarioAdminForm(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 160) String email,
            @Size(max = 30) String telefone,
            @Size(max = 30) String creci,
            @NotEmpty Set<Perfil> papeis,
            boolean ativo,
            @Size(min = 8, max = 72) String senha) {
    }

    public record ResetSenhaForm(@NotBlank @Size(min = 8, max = 72) String novaSenha) {
    }

    public record ApiTokenForm(@NotBlank @Size(max = 80) String nome, @NotNull Perfil perfil,
            @Min(0) @Max(3650) Integer validadeDias) {
    }

    public record ApiTokenDto(Long id, String nome, String prefixo, Perfil perfil, Instant criadoEm, Instant expiraEm,
            Instant ultimoUso) {

        public static ApiTokenDto of(ApiToken t) {
            return new ApiTokenDto(t.getId(), t.getNome(), t.getPrefixo(), t.getPerfil(), t.getCriadoEm(),
                    t.getExpiraEm(), t.getUltimoUso());
        }
    }

    /** Resposta da criação: o token completo aparece somente aqui. */
    public record ApiTokenCriado(ApiTokenDto info, String token) {
    }
}
