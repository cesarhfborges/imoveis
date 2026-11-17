package br.com.chfb.imoveis.platform.documento;

import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.platform.documento.DocumentoDtos.AceiteItem;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoAdmin;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoForm;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoPublico;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.DocumentoResumo;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.VersaoDetalhe;
import br.com.chfb.imoveis.platform.documento.DocumentoDtos.VersaoResumo;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/**
 * Documentos do site e seus aceites.
 *
 * <ul>
 *   <li><b>Inativo</b>: some do site e deixa de exigir aceite; aceites e versões continuam guardados.</li>
 *   <li><b>Excluído</b> (lógico): também some do painel (pode ser restaurado, volta inativo).</li>
 *   <li><b>Nova versão</b>: guarda o texto no histórico e passa a exigir novo aceite; "correção" atualiza a versão
 *       atual sem pedir aceite de novo.</li>
 * </ul>
 */
@Service
public class DocumentoService {

    private final DocumentoRepository documentos;
    private final DocumentoVersaoRepository versoes;
    private final DocumentoAceiteRepository aceites;

    public DocumentoService(DocumentoRepository documentos, DocumentoVersaoRepository versoes,
            DocumentoAceiteRepository aceites) {
        this.documentos = documentos;
        this.versoes = versoes;
        this.aceites = aceites;
    }

    // ------------------------------------------------------------------ site

    @Transactional(readOnly = true)
    public List<DocumentoResumo> publicos() {
        return documentos.ativos().stream().filter(Documento::isPublico).map(DocumentoResumo::of).toList();
    }

    /** Qualquer documento ativo pode ser lido pelo endereço (inclusive os que não aparecem na central). */
    @Transactional(readOnly = true)
    public DocumentoPublico porSlug(String slug) {
        return documentos.ativoPorSlug(slug).map(DocumentoPublico::of)
                .orElseThrow(() -> new NotFoundException("Documento não encontrado"));
    }

    /** Documentos que a pessoa precisa aceitar para criar a conta com o perfil informado. */
    @Transactional(readOnly = true)
    public List<DocumentoPublico> exigidosNoCadastro(Perfil perfil) {
        return documentos.ativos().stream().filter(d -> d.isAceiteCadastro() && d.getAceitePerfil().vale(perfil))
                .map(DocumentoPublico::of).toList();
    }

    /** Documentos cuja versão atual o usuário logado ainda não aceitou (bloqueiam o uso até aceitar). */
    @Transactional(readOnly = true)
    public List<DocumentoPublico> pendentes(AuthUser u) {
        List<Documento> exigidos = documentos.ativos().stream()
                .filter(d -> d.isAceiteContas() && d.getAceitePerfil().vale(u.perfil())).toList();
        if (exigidos.isEmpty()) {
            return List.of();
        }
        Set<String> aceitos = aceitosPor(u.id(), exigidos.stream().map(Documento::getId).toList());
        return exigidos.stream().filter(d -> !aceitos.contains(d.getId() + ":" + d.getVersao()))
                .map(DocumentoPublico::of).toList();
    }

    @Transactional
    public void aceitar(AuthUser u, List<AceiteItem> itens, String ip) {
        Map<Long, Documento> porId = documentos.findAllById(itens.stream().map(AceiteItem::documentoId).toList())
                .stream().collect(Collectors.toMap(Documento::getId, Function.identity()));
        for (AceiteItem item : itens) {
            Documento d = porId.get(item.documentoId());
            if (d == null || !d.isAtivo() || d.getExcluidoEm() != null) {
                throw new NotFoundException("Documento não encontrado");
            }
            if (d.getVersao() != item.versao()) {
                throw new BusinessException(409, "\"" + d.getTitulo() + "\" foi atualizado. Recarregue a página para ler a versão nova.");
            }
            registrar(d, u.id(), DocumentoAceite.Origem.CONTA, ip);
        }
    }

    /** Valida, antes de criar a conta, se todos os documentos exigidos no cadastro foram aceitos na versão atual. */
    @Transactional(readOnly = true)
    public void validarAceitesDoCadastro(Perfil perfil, List<AceiteItem> itens) {
        Set<String> enviados = itens == null ? Set.of()
                : itens.stream().filter(Objects::nonNull).map(i -> i.documentoId() + ":" + i.versao()).collect(Collectors.toSet());
        List<String> faltando = exigidosNoCadastro(perfil).stream()
                .filter(d -> !enviados.contains(d.id() + ":" + d.versao())).map(DocumentoPublico::titulo).toList();
        if (!faltando.isEmpty()) {
            throw new BusinessException("Para criar a conta, leia e aceite: " + String.join(", ", faltando) + ".");
        }
    }

    /** Grava os aceites do cadastro (depois de a conta ser criada). */
    @Transactional
    public void registrarAceitesDoCadastro(Long usuarioId, Perfil perfil, List<AceiteItem> itens, String ip) {
        if (itens == null || itens.isEmpty()) {
            return;
        }
        Set<Long> ids = itens.stream().filter(Objects::nonNull).map(AceiteItem::documentoId).collect(Collectors.toSet());
        for (Documento d : documentos.findAllById(ids)) {
            boolean versaoCerta = itens.stream().anyMatch(i -> i.documentoId().equals(d.getId()) && i.versao() == d.getVersao());
            if (d.isAtivo() && d.getExcluidoEm() == null && versaoCerta) {
                registrar(d, usuarioId, DocumentoAceite.Origem.CADASTRO, ip);
            }
        }
    }

    // ------------------------------------------------------------------ administração

    @Transactional(readOnly = true)
    public List<DocumentoAdmin> listarAdmin(boolean incluirExcluidos) {
        return (incluirExcluidos ? documentos.todos() : documentos.naoExcluidos()).stream().map(this::admin).toList();
    }

    @Transactional(readOnly = true)
    public DocumentoAdmin obterAdmin(Long id) {
        return admin(carregar(id));
    }

    @Transactional
    public DocumentoAdmin criar(DocumentoForm f, Long autorId) {
        Documento d = new Documento();
        aplicar(d, f);
        d.setVersao(1);
        d.setVersaoEm(Instant.now());
        d = documentos.save(d);
        guardarVersao(d, f.notaVersao(), autorId);
        return admin(d);
    }

    @Transactional
    public DocumentoAdmin atualizar(Long id, DocumentoForm f, Long autorId) {
        Documento d = carregar(id);
        if (d.getExcluidoEm() != null) {
            throw new BusinessException(409, "Restaure o documento antes de editar");
        }
        String tituloAntes = d.getTitulo();
        String conteudoAntes = d.getConteudo();
        aplicar(d, f);
        boolean mudouTexto = !Objects.equals(tituloAntes, d.getTitulo()) || !Objects.equals(conteudoAntes, d.getConteudo());
        if (f.novaVersao() && mudouTexto) {
            d.setVersao(d.getVersao() + 1);
            d.setVersaoEm(Instant.now());
            guardarVersao(d, f.notaVersao(), autorId);
        } else if (mudouTexto) {
            // correção: atualiza o texto guardado da versão atual (não pede novo aceite)
            DocumentoVersao v = versoes.findByDocumentoIdAndVersao(d.getId(), d.getVersao()).orElseGet(DocumentoVersao::new);
            preencherVersao(v, d, v.getNota() == null ? f.notaVersao() : v.getNota(), autorId);
            versoes.save(v);
        }
        return admin(documentos.save(d));
    }

    @Transactional
    public DocumentoAdmin situacao(Long id, boolean ativo) {
        Documento d = carregar(id);
        if (d.getExcluidoEm() != null) {
            throw new BusinessException(409, "Restaure o documento antes de ativar");
        }
        if (ativo && TextoDocumento.vazio(d.getConteudo())) {
            throw new BusinessException("Escreva o conteúdo do documento antes de ativar");
        }
        d.setAtivo(ativo);
        return admin(documentos.save(d));
    }

    /** Exclusão lógica: desativa e tira do painel; histórico e aceites ficam guardados (comprovação LGPD). */
    @Transactional
    public void excluir(Long id) {
        Documento d = carregar(id);
        d.setAtivo(false);
        d.setExcluidoEm(Instant.now());
        documentos.save(d);
    }

    @Transactional
    public DocumentoAdmin restaurar(Long id) {
        Documento d = carregar(id);
        if (d.getExcluidoEm() == null) {
            return admin(d);
        }
        if (documentos.slugEmUso(d.getSlug(), d.getId())) {
            throw new BusinessException(409, "Outro documento já usa o endereço /documentos/" + d.getSlug() + ". Mude o endereço dele antes de restaurar este.");
        }
        d.setExcluidoEm(null);
        d.setAtivo(false);
        return admin(documentos.save(d));
    }

    @Transactional(readOnly = true)
    public List<VersaoResumo> versoes(Long id) {
        carregar(id);
        return versoes.findByDocumentoIdOrderByVersaoDesc(id).stream()
                .map(v -> new VersaoResumo(v.getVersao(), v.getTitulo(), v.getNota(), v.getPublicadoEm(),
                        aceites.countByDocumentoIdAndVersao(id, v.getVersao())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VersaoDetalhe versao(Long id, int versao) {
        return versoes.findByDocumentoIdAndVersao(id, versao)
                .map(v -> new VersaoDetalhe(v.getVersao(), v.getTitulo(), v.getConteudo(), v.getNota(), v.getPublicadoEm()))
                .orElseThrow(() -> new NotFoundException("Versão não encontrada"));
    }

    // ------------------------------------------------------------------ internos

    private void aplicar(Documento d, DocumentoForm f) {
        String slug = f.slug().trim();
        if (documentos.slugEmUso(slug, d.getId())) {
            throw new BusinessException(409, "Já existe um documento com o endereço /documentos/" + slug);
        }
        String conteudo = TextoDocumento.limpar(f.conteudo());
        if (f.ativo() && TextoDocumento.vazio(conteudo)) {
            throw new BusinessException("Escreva o conteúdo do documento antes de ativar");
        }
        d.setTipo(f.tipo());
        d.setTitulo(f.titulo().trim());
        d.setSlug(slug);
        d.setResumo(f.resumo() == null || f.resumo().isBlank() ? null : f.resumo().trim());
        d.setConteudo(conteudo);
        d.setAtivo(f.ativo());
        d.setPublico(f.publico());
        d.setAceiteCadastro(f.aceiteCadastro());
        d.setAceiteContas(f.aceiteContas());
        d.setAceitePerfil(f.aceitePerfil());
        d.setOrdem(f.ordem());
    }

    private void guardarVersao(Documento d, String nota, Long autorId) {
        DocumentoVersao v = new DocumentoVersao();
        preencherVersao(v, d, nota, autorId);
        versoes.save(v);
    }

    private static void preencherVersao(DocumentoVersao v, Documento d, String nota, Long autorId) {
        v.setDocumentoId(d.getId());
        v.setVersao(d.getVersao());
        v.setTitulo(d.getTitulo());
        v.setConteudo(d.getConteudo());
        v.setNota(nota == null || nota.isBlank() ? null : nota.trim());
        v.setPublicadoPor(autorId);
        v.setPublicadoEm(Instant.now());
    }

    private void registrar(Documento d, Long usuarioId, DocumentoAceite.Origem origem, String ip) {
        if (!aceites.existsByDocumentoIdAndUsuarioIdAndVersao(d.getId(), usuarioId, d.getVersao())) {
            aceites.save(DocumentoAceite.de(d, usuarioId, origem, ip));
        }
    }

    private Set<String> aceitosPor(Long usuarioId, Collection<Long> ids) {
        Set<String> s = new HashSet<>();
        for (Object[] l : aceites.aceitosPor(usuarioId, ids)) {
            s.add(l[0] + ":" + l[1]);
        }
        return s;
    }

    private DocumentoAdmin admin(Documento d) {
        return new DocumentoAdmin(d.getId(), d.getTipo(), d.getTitulo(), d.getSlug(), d.getResumo(), d.getConteudo(),
                d.getVersao(), d.getVersaoEm(), d.isAtivo(), d.isPublico(), d.isAceiteCadastro(), d.isAceiteContas(),
                d.getAceitePerfil(), d.getOrdem(), d.getExcluidoEm(),
                d.getId() == null ? 0 : aceites.countByDocumentoIdAndVersao(d.getId(), d.getVersao()),
                d.getId() == null ? 0 : aceites.countByDocumentoId(d.getId()), d.getAtualizadoEm());
    }

    private Documento carregar(Long id) {
        return documentos.findById(id).orElseThrow(() -> new NotFoundException("Documento não encontrado"));
    }
}
