package br.com.chfb.imoveis.coreapi.service;

import java.time.Instant;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.AuthDtos.LoginRequest;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.RegistroRequest;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.Sessao;
import br.com.chfb.imoveis.coreapi.dto.AuthDtos.UsuarioSessao;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.platform.documento.DocumentoService;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/**
 * Regras de login:
 * <ul>
 *     <li>área "conta" (/conta/login): entra como CLIENTE ou CORRETOR;</li>
 *     <li>área "admin" (/admin/login): entra somente como ADMIN;</li>
 *     <li>o perfil escolhido precisa estar entre os permitidos pela hierarquia do usuário.</li>
 * </ul>
 */
@Service
public class AuthService {

    private static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos";

    private final UsuarioRepository usuarios;
    private final UsuarioService usuarioService;
    private final ConfiguracaoService configuracao;
    private final PasswordEncoder encoder;
    private final DocumentoService documentos;

    public AuthService(UsuarioRepository usuarios, UsuarioService usuarioService, ConfiguracaoService configuracao,
            PasswordEncoder encoder, DocumentoService documentos) {
        this.usuarios = usuarios;
        this.usuarioService = usuarioService;
        this.configuracao = configuracao;
        this.encoder = encoder;
        this.documentos = documentos;
    }

    @Transactional
    public AuthUser login(LoginRequest req) {
        boolean areaAdmin = "admin".equalsIgnoreCase(req.area());
        if (areaAdmin && req.perfil() != Perfil.ADMIN) {
            throw new BusinessException("Na área administrativa o perfil deve ser ADMIN");
        }
        if (!areaAdmin && req.perfil() == Perfil.ADMIN) {
            throw new ForbiddenException("Administradores entram pela página /admin");
        }
        Usuario u = usuarios.findByEmailIgnoreCase(UsuarioService.normalizarEmail(req.email()))
                .filter(x -> encoder.matches(req.senha(), x.getSenhaHash()))
                .orElseThrow(() -> new BusinessException(401, CREDENCIAIS_INVALIDAS));
        if (!u.isAtivo()) {
            throw new ForbiddenException("Conta desativada. Fale com o suporte.");
        }
        if (!u.perfisPermitidos().contains(req.perfil())) {
            throw new ForbiddenException("Sua conta não tem acesso como " + req.perfil().name().toLowerCase());
        }
        u.setUltimoAcesso(Instant.now());
        return authUser(u, req.perfil());
    }

    @Transactional
    public AuthUser registrar(RegistroRequest req, String ip) {
        if (req.tipo() == Perfil.ADMIN) {
            throw new ForbiddenException("Cadastro de administrador não é permitido");
        }
        if (req.tipo() == Perfil.CORRETOR && !configuracao.atual().isPermitirCadastroCorretor()) {
            throw new ForbiddenException("O cadastro de corretores está fechado no momento");
        }
        // termos de uso, privacidade etc. marcados para aceite no cadastro precisam vir aceitos (versão atual)
        documentos.validarAceitesDoCadastro(req.tipo(), req.aceites());
        Usuario u = usuarioService.registrar(req.nome(), req.email(), req.senha(), req.telefone(), req.creci(), req.tipo());
        documentos.registrarAceitesDoCadastro(u.getId(), req.tipo(), req.aceites(), ip);
        if (req.tipo() == Perfil.CORRETOR) {
            if (req.creci() == null || req.creci().isBlank()) {
                throw new BusinessException("Informe o CRECI para anunciar como corretor ou imobiliária");
            }
            u.setDocumento(req.documento());
            u.setTipoAnunciante(req.tipoAnunciante() == null ? "CORRETOR" : req.tipoAnunciante());
        }
        u.setUltimoAcesso(Instant.now());
        return authUser(u, req.tipo());
    }

    /** Troca entre CLIENTE e CORRETOR na mesma sessão (ADMIN só pela página /admin). */
    @Transactional(readOnly = true)
    public AuthUser trocarPerfil(AuthUser atual, Perfil novo) {
        if (novo == Perfil.ADMIN) {
            throw new ForbiddenException("Administradores entram pela página /admin");
        }
        Usuario u = usuarioService.obter(atual.id());
        if (!u.isAtivo() || !u.perfisPermitidos().contains(novo)) {
            throw new ForbiddenException("Sua conta não tem acesso como " + novo.name().toLowerCase());
        }
        return authUser(u, novo);
    }

    @Transactional(readOnly = true)
    public Sessao sessao(AuthUser auth) {
        if (auth == null) {
            return Sessao.anonima();
        }
        Usuario u = usuarios.findById(auth.id()).orElse(null);
        if (u == null || !u.isAtivo()) {
            return Sessao.anonima();
        }
        Set<Perfil> perfis = u.perfisPermitidos();
        return new Sessao(true,
                new UsuarioSessao(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getCreci(), u.getFotoUrl()),
                auth.perfil(), perfis);
    }

    private static AuthUser authUser(Usuario u, Perfil perfil) {
        return new AuthUser(u.getId(), u.getNome(), u.getEmail(), perfil, AuthUser.VIA_SESSION);
    }
}
