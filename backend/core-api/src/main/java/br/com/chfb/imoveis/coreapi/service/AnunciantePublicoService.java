package br.com.chfb.imoveis.coreapi.service;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.AnunciantePerfil;
import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.AnuncianteResumo;
import br.com.chfb.imoveis.coreapi.dto.AnuncianteDtos.ContatoAnunciante;
import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.AnunciosPublicos;
import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy;
import br.com.chfb.imoveis.sharedkernel.port.ExibicaoTelefonePolicy.Modo;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/** Diretório e perfil público de corretores e imobiliárias (só quem ligou o perfil público). */
@Service
public class AnunciantePublicoService {

    private final UsuarioRepository usuarios;
    private final AnunciosPublicos anuncios;
    private final ExibicaoTelefonePolicy exibicaoTelefone;

    public AnunciantePublicoService(UsuarioRepository usuarios, AnunciosPublicos anuncios,
            ExibicaoTelefonePolicy exibicaoTelefone) {
        this.usuarios = usuarios;
        this.anuncios = anuncios;
        this.exibicaoTelefone = exibicaoTelefone;
    }

    /**
     * @param tipo   CORRETOR, IMOBILIARIA ou nulo (todos)
     * @param cidade cidade exata (sem diferenciar acentos/maiúsculas)
     * @param q      parte do nome, razão social, bairro ou cidade
     */
    @Transactional(readOnly = true)
    public List<AnuncianteResumo> listar(String tipo, String cidade, String uf, String q) {
        List<Usuario> lista = usuarios.perfisPublicos(Perfil.CORRETOR).stream()
                .filter(u -> tipo == null || tipo.isBlank() || tipo.equalsIgnoreCase(tipoDe(u)))
                .filter(u -> cidade == null || cidade.isBlank() || normalizar(cidade).equals(normalizar(u.getCidade())))
                .filter(u -> uf == null || uf.isBlank() || uf.equalsIgnoreCase(u.getUf()))
                .filter(u -> q == null || q.isBlank() || contem(u, normalizar(q)))
                .toList();
        Map<Long, Long> total = anuncios.contarAtivos(lista.stream().map(Usuario::getId).toList());
        return lista.stream()
                .map(u -> new AnuncianteResumo(u.getId(), u.getNome(), tipoDe(u), u.getFotoUrl(), u.getCreci(),
                        u.getCreciUf(), u.getBairro(), u.getCidade(), u.getUf(), u.getLatitude(), u.getLongitude(),
                        total.getOrDefault(u.getId(), 0L)))
                .sorted(Comparator.comparingLong(AnuncianteResumo::totalAnuncios).reversed()
                        .thenComparing(a -> normalizar(a.nome())))
                .toList();
    }

    @Transactional(readOnly = true)
    public AnunciantePerfil perfil(Long id, boolean logado) {
        Usuario u = publico(id);
        Modo modo = ExibicaoTelefonePolicy.efetivo(exibicaoTelefone.telefoneAnunciante(), logado);
        String tel = u.getTelefone() != null ? u.getTelefone() : u.getWhatsapp();
        String telefone = null;
        boolean completo = false;
        String whatsapp = null;
        if (tel != null && modo == Modo.MOSTRAR) {
            telefone = tel;
            completo = true;
            whatsapp = u.getWhatsapp();
        } else if (tel != null && modo == Modo.MOSTRAR_APENAS_LOGADO) {
            telefone = ExibicaoTelefonePolicy.inicio(tel);
        }
        long total = anuncios.contarAtivos(List.of(u.getId())).getOrDefault(u.getId(), 0L);
        return new AnunciantePerfil(u.getId(), u.getNome(), tipoDe(u), u.getRazaoSocial(), u.getFotoUrl(), u.getCapaUrl(), u.getCreci(),
                u.getCreciUf(), u.getSobre(), u.getRegioesAtuacao(), u.getAtuandoDesde(), u.getSite(), u.getInstagram(),
                u.getFacebook(), u.getEmailContato(), telefone, completo, whatsapp, u.getCep(), u.getLogradouro(),
                u.getNumero(), u.getComplemento(), u.getBairro(), u.getCidade(), u.getUf(), u.getLatitude(),
                u.getLongitude(), u.getCriadoEm(), total);
    }

    /** Telefone e WhatsApp completos (botão "Ver telefone"); exige login em MOSTRAR_APENAS_LOGADO. */
    @Transactional(readOnly = true)
    public ContatoAnunciante telefone(Long id, boolean logado) {
        Modo modo = ExibicaoTelefonePolicy.efetivo(exibicaoTelefone.telefoneAnunciante(), logado);
        if (modo == Modo.OCULTAR) {
            throw new NotFoundException("Telefone não disponível");
        }
        if (modo == Modo.MOSTRAR_APENAS_LOGADO) {
            throw new BusinessException(401, "Entre na sua conta para ver o telefone do anunciante");
        }
        Usuario u = publico(id);
        if (u.getTelefone() == null && u.getWhatsapp() == null) {
            throw new NotFoundException("Telefone não disponível");
        }
        return new ContatoAnunciante(u.getTelefone() != null ? u.getTelefone() : u.getWhatsapp(), u.getWhatsapp());
    }

    private Usuario publico(Long id) {
        return usuarios.findById(id).filter(UsuarioService::temPerfilPublico)
                .orElseThrow(() -> new NotFoundException("Perfil não encontrado"));
    }

    private static String tipoDe(Usuario u) {
        return "IMOBILIARIA".equals(u.getTipoAnunciante()) ? "IMOBILIARIA" : "CORRETOR";
    }

    private static boolean contem(Usuario u, String termo) {
        return normalizar(u.getNome()).contains(termo) || normalizar(u.getRazaoSocial()).contains(termo)
                || normalizar(u.getBairro()).contains(termo) || normalizar(u.getCidade()).contains(termo);
    }

    /** Minúsculas e sem acentos: "Águas Claras" → "aguas claras". */
    static String normalizar(String s) {
        if (s == null) {
            return "";
        }
        return Normalizer.normalize(s.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
}
