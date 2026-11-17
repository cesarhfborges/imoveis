package br.com.chfb.imoveis.coreapi.dto;

import java.util.List;
import java.util.Set;

import br.com.chfb.imoveis.platform.documento.DocumentoDtos.AceiteItem;
import jakarta.validation.Valid;

import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** DTOs de autenticação e sessão. */
public final class AuthDtos {

    private AuthDtos() {
    }

    /**
     * @param area "conta" (login de cliente/corretor em /conta/login) ou "admin" (login em /admin/login)
     */
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String senha, @NotNull Perfil perfil,
            String area) {
    }

    public record TrocarPerfilRequest(@NotNull Perfil perfil) {
    }

    public record RegistroRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 8, max = 72) String senha,
            @Size(max = 30) String telefone,
            @NotNull Perfil tipo,
            @Size(max = 30) String creci,
            @Pattern(regexp = "^$|^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$|^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$", message = "CPF ou CNPJ inválido") String documento,
            @Pattern(regexp = "CORRETOR|IMOBILIARIA") String tipoAnunciante,
            /** Documentos aceitos no cadastro (termos de uso, privacidade…), com a versão lida. */
            @Size(max = 20) List<@Valid AceiteItem> aceites) {
    }

    public record UsuarioSessao(Long id, String nome, String email, String telefone, String creci, String fotoUrl) {
    }

    public record Sessao(boolean autenticado, UsuarioSessao usuario, Perfil perfil, Set<Perfil> perfisDisponiveis) {

        public static Sessao anonima() {
            return new Sessao(false, null, null, Set.of());
        }
    }

    public record CsrfResponse(String headerName, String parameterName, String token) {
    }
}
