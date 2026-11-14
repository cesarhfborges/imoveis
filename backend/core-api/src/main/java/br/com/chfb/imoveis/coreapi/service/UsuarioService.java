package br.com.chfb.imoveis.coreapi.service;

import java.util.Collection;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.ContaDtos.PerfilForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.SenhaForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.UsuarioAdminForm;
import br.com.chfb.imoveis.coreapi.dto.ContaDtos.UsuarioDto;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

@Service
public class UsuarioService implements AnuncianteProvider {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.encoder = encoder;
    }

    // --------------------------------------------------------- AnuncianteProvider

    @Override
    @Transactional(readOnly = true)
    public Optional<AnuncianteInfo> buscar(Long usuarioId) {
        return usuarioId == null ? Optional.empty() : usuarios.findById(usuarioId).map(this::info);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, AnuncianteInfo> buscarTodos(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return usuarios.findAllById(ids).stream().map(this::info)
                .collect(Collectors.toMap(AnuncianteInfo::id, Function.identity()));
    }

    private AnuncianteInfo info(Usuario u) {
        return new AnuncianteInfo(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getCreci(), u.getFotoUrl());
    }

    // ------------------------------------------------------------------ conta

    @Transactional(readOnly = true)
    public Usuario obter(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
    }

    @Transactional
    public Usuario registrar(String nome, String email, String senha, String telefone, String creci, Perfil tipo) {
        String emailNorm = normalizarEmail(email);
        if (usuarios.existsByEmailIgnoreCase(emailNorm)) {
            throw new BusinessException(409, "Já existe uma conta com este e-mail");
        }
        Usuario u = new Usuario();
        u.setNome(nome.trim());
        u.setEmail(emailNorm);
        u.setSenhaHash(encoder.encode(senha));
        u.setTelefone(telefone);
        u.setCreci(creci);
        EnumSet<Perfil> papeis = EnumSet.of(Perfil.CLIENTE);
        if (tipo == Perfil.CORRETOR) {
            papeis.add(Perfil.CORRETOR);
        }
        u.setPapeis(papeis);
        return usuarios.save(u);
    }

    @Transactional
    public UsuarioDto atualizarPerfil(AuthUser auth, PerfilForm form) {
        Usuario u = obter(auth.id());
        u.setNome(form.nome().trim());
        u.setTelefone(form.telefone());
        u.setCreci(form.creci());
        u.setFotoUrl(form.fotoUrl());
        return UsuarioDto.of(u);
    }

    @Transactional
    public void trocarSenha(AuthUser auth, SenhaForm form) {
        Usuario u = obter(auth.id());
        if (!encoder.matches(form.senhaAtual(), u.getSenhaHash())) {
            throw new BusinessException(400, "Senha atual incorreta");
        }
        u.setSenhaHash(encoder.encode(form.novaSenha()));
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public PageResponse<UsuarioDto> buscar(String q, Perfil papel, int page, int size) {
        String termo = q == null || q.isBlank() ? "%" : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        PageRequest pagina = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("nome"));
        return PageResponse.of(usuarios.buscar(termo, papel, pagina), UsuarioDto::of);
    }

    @Transactional
    public UsuarioDto criarPeloAdmin(UsuarioAdminForm form) {
        if (form.senha() == null || form.senha().isBlank()) {
            throw new BusinessException("Informe uma senha inicial");
        }
        String email = normalizarEmail(form.email());
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(409, "Já existe uma conta com este e-mail");
        }
        Usuario u = new Usuario();
        u.setSenhaHash(encoder.encode(form.senha()));
        aplicarAdmin(u, form, email);
        return UsuarioDto.of(usuarios.save(u));
    }

    @Transactional
    public UsuarioDto atualizarPeloAdmin(Long id, UsuarioAdminForm form, AuthUser admin) {
        Usuario u = obter(id);
        String email = normalizarEmail(form.email());
        usuarios.findByEmailIgnoreCase(email).filter(o -> !o.getId().equals(id)).ifPresent(o -> {
            throw new BusinessException(409, "Já existe uma conta com este e-mail");
        });
        if (id.equals(admin.id()) && (!form.papeis().contains(Perfil.ADMIN) || !form.ativo())) {
            throw new BusinessException("Você não pode remover o próprio acesso de administrador");
        }
        aplicarAdmin(u, form, email);
        if (form.senha() != null && !form.senha().isBlank()) {
            u.setSenhaHash(encoder.encode(form.senha()));
        }
        return UsuarioDto.of(u);
    }

    @Transactional
    public void excluir(Long id, AuthUser admin) {
        if (id.equals(admin.id())) {
            throw new BusinessException("Você não pode excluir a própria conta");
        }
        Usuario u = obter(id);
        u.setAtivo(false);
    }

    private void aplicarAdmin(Usuario u, UsuarioAdminForm f, String email) {
        u.setNome(f.nome().trim());
        u.setEmail(email);
        u.setTelefone(f.telefone());
        u.setCreci(f.creci());
        u.setAtivo(f.ativo());
        EnumSet<Perfil> papeis = EnumSet.noneOf(Perfil.class);
        papeis.addAll(f.papeis());
        papeis.add(Perfil.CLIENTE);
        u.getPapeis().clear();
        u.getPapeis().addAll(papeis);
    }

    @Transactional(readOnly = true)
    public long contarPorPapel(Perfil papel) {
        return usuarios.contarPorPapel(papel);
    }

    @Transactional(readOnly = true)
    public long contar() {
        return usuarios.count();
    }

    public static String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
