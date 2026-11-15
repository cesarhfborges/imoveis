package br.com.chfb.imoveis.platform.aviso;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoDto;
import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoForm;
import br.com.chfb.imoveis.platform.aviso.AvisoDtos.AvisoPublicoDto;
import br.com.chfb.imoveis.platform.texto.TextoRico;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Avisos do site. O site pede os avisos da área em que está (SITE, CONTA ou ADMIN) e mostra os que o usuário
 * ainda não aceitou na versão atual: logado, o aceite fica aqui; visitante, no navegador.
 */
@Service
public class AvisoService {

    private final AvisoRepository avisos;
    private final AvisoAceiteRepository aceites;

    public AvisoService(AvisoRepository avisos, AvisoAceiteRepository aceites) {
        this.avisos = avisos;
        this.aceites = aceites;
    }

    // ------------------------------------------------------------------ site

    /** Avisos vigentes da área para este público, com a versão que o usuário logado já aceitou. */
    @Transactional(readOnly = true)
    public List<AvisoPublicoDto> vigentes(Aviso.Area area, AuthUser u) {
        Instant agora = Instant.now();
        boolean logado = u != null;
        List<Aviso> lista = avisos.findByAtivoTrueOrderByOrdemAscIdAsc().stream()
                .filter(a -> a.vigente(agora) && a.getAreasSet().contains(area))
                .filter(a -> a.getPublico() == PublicoAviso.TODOS
                        || (a.getPublico() == PublicoAviso.LOGADOS) == logado)
                .toList();
        Map<Long, Integer> aceitas = !logado || lista.isEmpty() ? Map.of()
                : aceites.findByUsuarioIdAndAvisoIdIn(u.id(), lista.stream().map(Aviso::getId).toList()).stream()
                        .collect(Collectors.toMap(AvisoAceite::getAvisoId, AvisoAceite::getVersao));
        return lista.stream().map(a -> AvisoPublicoDto.of(a, aceitas.get(a.getId()))).toList();
    }

    /** Registra (ou atualiza) o aceite do usuário logado na versão informada. */
    @Transactional
    public void aceitar(Long avisoId, int versao, AuthUser u) {
        Aviso a = carregar(avisoId);
        if (versao > a.getVersao()) {
            throw new BusinessException("Versão do aviso inválida");
        }
        AvisoAceite aceite = aceites.findByAvisoIdAndUsuarioId(avisoId, u.id()).orElseGet(() -> {
            AvisoAceite n = new AvisoAceite();
            n.setAvisoId(avisoId);
            n.setUsuarioId(u.id());
            return n;
        });
        if (aceite.getId() != null && aceite.getVersao() >= versao) {
            return;
        }
        aceite.setVersao(versao);
        aceite.setAceitoEm(Instant.now());
        aceites.save(aceite);
    }

    // ------------------------------------------------------------------ administração

    @Transactional(readOnly = true)
    public List<AvisoDto> listar() {
        return avisos.findAllByOrderByOrdemAscIdAsc().stream()
                .map(a -> AvisoDto.of(a, aceites.aceitesDaVersao(a.getId(), a.getVersao()))).toList();
    }

    /**
     * Cria ou altera. Mudou o que o usuário vê (título, mensagem, botões, links) ou pediu {@code novaVersao}:
     * a versão sobe e todos veem o aviso de novo.
     */
    @Transactional
    public AvisoDto salvar(Long id, AvisoForm f) {
        if (!f.tipo().posicoes().contains(f.posicao())) {
            throw new BusinessException("Posição \"" + f.posicao() + "\" não existe para " + f.tipo().name().toLowerCase()
                    + ". Use: " + String.join(", ", f.tipo().posicoes().stream().sorted().toList()));
        }
        String textoAceite = vazioNulo(f.textoAceite());
        String linkAceite = vazioNulo(f.linkAceite());
        if (!f.dispensavel() && textoAceite == null) {
            throw new BusinessException("Sem botão de aceite, o aviso precisa poder ser fechado (dispensável)");
        }
        if (f.acaoAceite() == AcaoAceite.LINK && (textoAceite == null || linkAceite == null)) {
            throw new BusinessException("Para abrir um endereço ao aceitar, informe o texto do botão e o endereço");
        }
        String textoLink = vazioNulo(f.textoLink());
        String urlLink = vazioNulo(f.urlLink());
        if ((textoLink == null) != (urlLink == null)) {
            throw new BusinessException("Informe o texto e o endereço do link secundário (ou deixe os dois vazios)");
        }
        if (f.inicioEm() != null && f.fimEm() != null && !f.fimEm().isAfter(f.inicioEm())) {
            throw new BusinessException("O fim da exibição precisa ser depois do início");
        }
        String mensagem = TextoRico.limpar(f.mensagem());
        if (TextoRico.vazio(mensagem)) {
            throw new BusinessException("Escreva a mensagem do aviso");
        }

        Aviso a = id == null ? new Aviso() : carregar(id);
        String titulo = vazioNulo(f.titulo());
        AcaoAceite acao = textoAceite == null ? AcaoAceite.FECHAR : f.acaoAceite();
        String link = acao == AcaoAceite.LINK ? linkAceite : null;
        boolean conteudoMudou = id != null && (!Objects.equals(a.getTitulo(), titulo) || !Objects.equals(a.getMensagem(), mensagem)
                || !Objects.equals(a.getTextoAceite(), textoAceite) || a.getAcaoAceite() != acao
                || !Objects.equals(a.getLinkAceite(), link) || !Objects.equals(a.getTextoLink(), textoLink)
                || !Objects.equals(a.getUrlLink(), urlLink));

        a.setNome(f.nome().trim());
        a.setTitulo(titulo);
        a.setMensagem(mensagem);
        a.setTipo(f.tipo());
        a.setPosicao(f.posicao());
        a.setSeveridade(f.severidade());
        a.setIcone(vazioNulo(f.icone()));
        a.setDispensavel(f.dispensavel());
        a.setModal(f.modal());
        a.setTextoAceite(textoAceite);
        a.setAcaoAceite(acao);
        a.setLinkAceite(link);
        a.setNovaAba(acao == AcaoAceite.LINK && f.novaAba());
        a.setTextoLink(textoLink);
        a.setUrlLink(urlLink);
        a.setPublico(f.publico());
        a.setAreasSet(f.areas());
        a.setAtivo(f.ativo());
        a.setOrdem(f.ordem());
        a.setInicioEm(f.inicioEm());
        a.setFimEm(f.fimEm());
        if (conteudoMudou || (id != null && f.novaVersao())) {
            a.setVersao(a.getVersao() + 1);
            a.setVersaoEm(Instant.now());
        }
        a = avisos.save(a);
        return AvisoDto.of(a, aceites.aceitesDaVersao(a.getId(), a.getVersao()));
    }

    @Transactional
    public void excluir(Long id) {
        avisos.delete(carregar(id));
    }

    private Aviso carregar(Long id) {
        return avisos.findById(id).orElseThrow(() -> new NotFoundException("Aviso não encontrado"));
    }

    private static String vazioNulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
