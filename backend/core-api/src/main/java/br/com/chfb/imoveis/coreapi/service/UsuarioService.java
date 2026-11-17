package br.com.chfb.imoveis.coreapi.service;

import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
import br.com.chfb.imoveis.listing.dto.PainelAnuncios;
import br.com.chfb.imoveis.listing.service.PainelService;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnuncianteProvider;
import br.com.chfb.imoveis.sharedkernel.port.UsuarioDiretorio;
import br.com.chfb.imoveis.sharedkernel.port.ContaModeracao;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;
import br.com.chfb.imoveis.sharedkernel.util.Digitos;
import br.com.chfb.imoveis.sharedkernel.util.DocumentoFiscal;

@Service
public class UsuarioService implements AnuncianteProvider, UsuarioDiretorio, ContaModeracao {

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

    // --------------------------------------------------------- UsuarioDiretorio

    @Override
    @Transactional(readOnly = true)
    public List<Long> administradores() {
        return usuarios.idsAtivosPorPapel(Perfil.ADMIN);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean contaAtiva(Long usuarioId) {
        return usuarioId != null && usuarios.existsByIdAndAtivoTrue(usuarioId);
    }

    // --------------------------------------------------------- ContaModeracao

    @Override
    @Transactional
    public boolean banir(Long usuarioId, String motivo) {
        Usuario u = usuarios.findById(usuarioId).orElse(null);
        if (u == null || !u.isAtivo()) {
            return false;
        }
        u.setAtivo(false);
        u.setBanidoEm(java.time.Instant.now());
        u.setBanidoMotivo(motivo == null ? null : motivo.length() > 300 ? motivo.substring(0, 300) : motivo);
        return true;
    }

    @Override
    @Transactional
    public boolean reativar(Long usuarioId) {
        Usuario u = usuarios.findById(usuarioId).orElse(null);
        if (u == null || u.getBanidoEm() == null) {
            return false;
        }
        u.setAtivo(true);
        u.setBanidoEm(null);
        u.setBanidoMotivo(null);
        return true;
    }

    private AnuncianteInfo info(Usuario u) {
        return new AnuncianteInfo(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getCreci(), u.getFotoUrl(),
                temPerfilPublico(u));
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
        u.setTelefone(vazioNulo(form.telefone()));
        u.setFotoUrl(vazioNulo(form.fotoUrl()));
        u.setWhatsapp(vazioNulo(form.whatsapp()));
        u.setEmailContato(vazioNulo(form.emailContato()));
        u.setCep(vazioNulo(form.cep()));
        u.setLogradouro(vazioNulo(form.logradouro()));
        u.setNumero(vazioNulo(form.numero()));
        u.setComplemento(vazioNulo(form.complemento()));
        u.setBairro(vazioNulo(form.bairro()));
        u.setCidade(vazioNulo(form.cidade()));
        u.setUf(vazioNulo(form.uf()));
        u.setLatitude(form.latitude());
        u.setLongitude(form.longitude());
        // dados profissionais: só para anunciantes (corretor/imobiliária)
        if (u.getPapeis().contains(Perfil.CORRETOR)) {
            // documento em branco mantém o atual: o anunciante corrige, mas não apaga o CPF/CNPJ
            aplicarDocumento(u, form.tipoAnunciante(), form.documento(), true);
            u.setCreci(vazioNulo(form.creci()));
            u.setCreciUf(vazioNulo(form.creciUf()));
            u.setRazaoSocial("IMOBILIARIA".equals(u.getTipoAnunciante()) ? vazioNulo(form.razaoSocial()) : null);
            u.setSite(vazioNulo(form.site()));
            u.setInstagram(instagram(form.instagram()));
            u.setFacebook(vazioNulo(form.facebook()));
            u.setSobre(vazioNulo(form.sobre()));
            u.setRegioesAtuacao(vazioNulo(form.regioesAtuacao()));
            u.setAtuandoDesde(form.atuandoDesde());
            u.setCapaUrl(vazioNulo(form.capaUrl()));
            // perfil público: só liga (ou continua ligado) com o cadastro completo
            boolean querPublico = form.perfilPublico() == null ? u.isPerfilPublico() : form.perfilPublico();
            if (querPublico) {
                List<String> faltando = pendenciasPerfilPublico(u);
                if (!faltando.isEmpty()) {
                    throw new BusinessException(422, "Para deixar o perfil público, complete: " + String.join(", ", faltando) + ".");
                }
            }
            u.setPerfilPublico(querPublico);
        } else {
            u.setPerfilPublico(false);
        }
        return UsuarioDto.of(u);
    }

    /** O perfil aparece no site só para anunciante ativo que ligou o perfil público. */
    public static boolean temPerfilPublico(Usuario u) {
        return u.isAtivo() && u.isPerfilPublico() && u.getPapeis().contains(Perfil.CORRETOR);
    }

    /**
     * O que falta para o anunciante poder ter perfil público: identificação, contato, apresentação,
     * endereço completo e a posição no mapa (o perfil aparece no mapa do diretório).
     */
    public static List<String> pendenciasPerfilPublico(Usuario u) {
        List<String> f = new ArrayList<>();
        if (vazio(u.getFotoUrl())) f.add("foto ou logo");
        if (vazio(u.getNome())) f.add("nome");
        if ("IMOBILIARIA".equals(u.getTipoAnunciante()) && vazio(u.getRazaoSocial())) f.add("razão social");
        if (vazio(u.getCreci()) || vazio(u.getCreciUf())) f.add("CRECI e UF do CRECI");
        if (vazio(u.getTelefone()) && vazio(u.getWhatsapp())) f.add("telefone ou WhatsApp");
        if (vazio(u.getSobre())) f.add("apresentação (Sobre)");
        if (u.getCep() == null || u.getCep().length() != 8) f.add("CEP");
        if (vazio(u.getLogradouro()) || vazio(u.getNumero())) f.add("logradouro e número");
        if (vazio(u.getBairro()) || vazio(u.getCidade()) || vazio(u.getUf())) f.add("bairro, cidade e UF");
        if (u.getLatitude() == null || u.getLongitude() == null) f.add("posição no mapa");
        return f;
    }

    /**
     * Tipo de anunciante e CPF/CNPJ, que precisam combinar: CPF para corretor, CNPJ para imobiliária.
     * Só valida os dígitos quando algo muda, para não travar quem já tem um documento antigo gravado.
     *
     * @param vazioMantem documento em branco mantém o atual (conta) em vez de apagar (admin)
     */
    static void aplicarDocumento(Usuario u, String tipo, String documento, boolean vazioMantem) {
        String novoTipo = tipo != null ? tipo : u.getTipoAnunciante() != null ? u.getTipoAnunciante() : "CORRETOR";
        String doc = Digitos.somente(documento);
        if (doc == null && vazioMantem) {
            doc = u.getDocumento();
        }
        boolean mudou = !Objects.equals(doc, u.getDocumento()) || !Objects.equals(novoTipo, u.getTipoAnunciante());
        if (mudou && doc != null) {
            boolean imobiliaria = "IMOBILIARIA".equals(novoTipo);
            if (imobiliaria ? !DocumentoFiscal.cnpjValido(doc) : !DocumentoFiscal.cpfValido(doc)) {
                throw new BusinessException(imobiliaria ? "CNPJ inválido. Confira os números." : "CPF inválido. Confira os números.");
            }
        }
        u.setTipoAnunciante(novoTipo);
        u.setDocumento(doc);
        if (!"IMOBILIARIA".equals(novoTipo)) {
            u.setRazaoSocial(null);
        }
    }

    private static boolean vazio(String v) {
        return v == null || v.isBlank();
    }

    private static String vazioNulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    /** Guarda o usuário do Instagram sem "@" nem o endereço completo. */
    private static String instagram(String v) {
        String s = vazioNulo(v);
        if (s == null) {
            return null;
        }
        s = s.replaceFirst("^(https?://)?(www\\.)?instagram\\.com/", "").replaceFirst("^@", "").replaceAll("/+$", "");
        return s.isBlank() ? null : s;
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
        if (f.papeis().contains(Perfil.CORRETOR)) {
            aplicarDocumento(u, f.tipoAnunciante(), f.documento(), false);
        }
        if (f.ativo() && !u.isAtivo()) {
            // reativar a conta tira o banimento
            u.setBanidoEm(null);
            u.setBanidoMotivo(null);
        }
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

    /** Novos cadastros por dia de {@code inicio} até hoje (dias sem cadastro vêm com zero). */
    @Transactional(readOnly = true)
    public List<PainelAnuncios.PontoDia> cadastrosPorDia(LocalDate inicio) {
        ZoneId fuso = PainelService.FUSO;
        Map<LocalDate, Long> mapa = new HashMap<>();
        for (Object[] l : usuarios.cadastrosPorDia(inicio.atStartOfDay(fuso).toInstant(), fuso.getId())) {
            LocalDate dia = l[0] instanceof Date d ? d.toLocalDate() : (LocalDate) l[0];
            mapa.put(dia, ((Number) l[1]).longValue());
        }
        List<PainelAnuncios.PontoDia> serie = new ArrayList<>();
        for (LocalDate d = inicio; !d.isAfter(LocalDate.now(fuso)); d = d.plusDays(1)) {
            serie.add(new PainelAnuncios.PontoDia(d, mapa.getOrDefault(d, 0L)));
        }
        return serie;
    }

    @Transactional(readOnly = true)
    public long contar() {
        return usuarios.count();
    }

    public static String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
