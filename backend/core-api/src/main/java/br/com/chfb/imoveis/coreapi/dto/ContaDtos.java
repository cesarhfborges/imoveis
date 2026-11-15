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
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** DTOs da conta do usuário, gestão de usuários e tokens de API. */
public final class ContaDtos {

    private ContaDtos() {
    }

    /**
     * Dados que o próprio usuário edita. Documento (CPF/CNPJ) e tipo de anunciante não mudam por aqui.
     *
     * @param razaoSocial    imobiliária: razão social (o {@code nome} é o nome de exibição/fantasia)
     * @param sobre          apresentação exibida aos clientes (texto simples)
     * @param regioesAtuacao bairros/regiões em que atua, separados por vírgula
     * @param atuandoDesde   ano em que começou a atuar
     */
    public record PerfilForm(@NotBlank @Size(max = 120) String nome, @Size(max = 30) String telefone,
            @Size(max = 30) String creci, @Size(max = 500) String fotoUrl,
            @Size(max = 160) String razaoSocial, @Size(max = 30) String whatsapp,
            @Email @Size(max = 160) String emailContato,
            @Pattern(regexp = "^$|^https?://\\S+$", message = "Informe o site começando com http:// ou https://") @Size(max = 200) String site,
            @Size(max = 100) String instagram, @Size(max = 200) String facebook, @Size(max = 2000) String sobre,
            @Pattern(regexp = "^$|^[A-Z]{2}$", message = "UF do CRECI inválida") String creciUf,
            @Size(max = 500) String regioesAtuacao, @Min(1900) @Max(2100) Short atuandoDesde,
            @Pattern(regexp = "^$|^\\d{5}-?\\d{3}$", message = "CEP inválido") String cep,
            @Size(max = 160) String logradouro, @Size(max = 20) String numero, @Size(max = 80) String complemento,
            @Size(max = 80) String bairro, @Size(max = 80) String cidade,
            @Pattern(regexp = "^$|^[A-Z]{2}$", message = "UF inválida") String uf) {
    }

    public record SenhaForm(@NotBlank String senhaAtual, @NotBlank @Size(min = 8, max = 72) String novaSenha) {
    }

    public record UsuarioDto(Long id, String nome, String email, String telefone, String creci, String documento,
            String tipoAnunciante, String fotoUrl, boolean ativo, Set<Perfil> papeis, Set<Perfil> perfisPermitidos, Instant ultimoAcesso, Instant criadoEm,
            Instant banidoEm, String banidoMotivo, String razaoSocial, String whatsapp, String emailContato,
            String site, String instagram, String facebook, String sobre, String creciUf, String regioesAtuacao,
            Short atuandoDesde, String cep, String logradouro, String numero, String complemento, String bairro,
            String cidade, String uf) {

        public static UsuarioDto of(Usuario u) {
            return new UsuarioDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getCreci(), u.getDocumento(),
                    u.getTipoAnunciante(), u.getFotoUrl(),
                    u.isAtivo(), Set.copyOf(u.getPapeis()), u.perfisPermitidos(), u.getUltimoAcesso(), u.getCriadoEm(),
                    u.getBanidoEm(), u.getBanidoMotivo(), u.getRazaoSocial(), u.getWhatsapp(), u.getEmailContato(),
                    u.getSite(), u.getInstagram(), u.getFacebook(), u.getSobre(), u.getCreciUf(), u.getRegioesAtuacao(),
                    u.getAtuandoDesde(), u.getCep(), u.getLogradouro(), u.getNumero(), u.getComplemento(), u.getBairro(),
                    u.getCidade(), u.getUf());
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
