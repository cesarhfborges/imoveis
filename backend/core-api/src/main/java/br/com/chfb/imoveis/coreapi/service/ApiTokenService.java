package br.com.chfb.imoveis.coreapi.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenCriado;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenDto;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.ApiTokenForm;
import br.com.chfb.imoveis.coreapi.entity.ApiToken;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.ApiTokenRepository;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/** Tokens pessoais para a API aberta. Formato: {@code imv_} + 40 caracteres aleatórios. */
@Service
public class ApiTokenService {

    private static final String PREFIXO = "imv_";
    private static final char[] ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();

    private final SecureRandom random = new SecureRandom();
    private final ApiTokenRepository tokens;
    private final UsuarioRepository usuarios;

    public ApiTokenService(ApiTokenRepository tokens, UsuarioRepository usuarios) {
        this.tokens = tokens;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<ApiTokenDto> listar(AuthUser u) {
        return tokens.findByUsuarioIdAndRevogadoFalseOrderByCriadoEmDesc(u.id()).stream().map(ApiTokenDto::of).toList();
    }

    @Transactional
    public ApiTokenCriado criar(ApiTokenForm form, AuthUser u) {
        Usuario usuario = usuarios.findById(u.id()).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        if (!usuario.perfisPermitidos().contains(form.perfil())) {
            throw new ForbiddenException("Você não possui o perfil " + form.perfil());
        }
        String valor = gerar();
        ApiToken t = new ApiToken();
        t.setUsuario(usuario);
        t.setNome(form.nome().trim());
        t.setPerfil(form.perfil());
        t.setPrefixo(valor.substring(0, 12));
        t.setTokenHash(hash(valor));
        if (form.validadeDias() != null && form.validadeDias() > 0) {
            t.setExpiraEm(Instant.now().plus(Duration.ofDays(form.validadeDias())));
        }
        return new ApiTokenCriado(ApiTokenDto.of(tokens.save(t)), valor);
    }

    @Transactional
    public void revogar(Long id, AuthUser u) {
        ApiToken t = tokens.findById(id).orElseThrow(() -> new NotFoundException("Token não encontrado"));
        if (!t.getUsuario().getId().equals(u.id())) {
            throw new ForbiddenException("Token de outro usuário");
        }
        t.setRevogado(true);
    }

    /** Valida o token e devolve o usuário com o perfil do token. */
    @Transactional
    public Optional<AuthUser> autenticar(String valor) {
        if (valor == null || !valor.startsWith(PREFIXO) || valor.length() > 100) {
            return Optional.empty();
        }
        Instant agora = Instant.now();
        return tokens.findByTokenHash(hash(valor))
                .filter(t -> t.valido(agora))
                .filter(t -> t.getUsuario().isAtivo())
                .filter(t -> t.getUsuario().perfisPermitidos().contains(t.getPerfil()))
                .map(t -> {
                    if (t.getUltimoUso() == null || t.getUltimoUso().isBefore(agora.minusSeconds(60))) {
                        t.setUltimoUso(agora);
                    }
                    Usuario us = t.getUsuario();
                    return new AuthUser(us.getId(), us.getNome(), us.getEmail(), t.getPerfil(), AuthUser.VIA_TOKEN);
                });
    }

    private String gerar() {
        StringBuilder b = new StringBuilder(PREFIXO);
        for (int i = 0; i < 40; i++) {
            b.append(ALFABETO[random.nextInt(ALFABETO.length)]);
        }
        return b.toString();
    }

    static String hash(String valor) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
