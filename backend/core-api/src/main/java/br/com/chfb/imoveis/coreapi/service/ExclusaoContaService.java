package br.com.chfb.imoveis.coreapi.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.SolicitacaoExclusaoRepository;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.listing.service.ImovelService;
import br.com.chfb.imoveis.moderation.service.ExclusaoDadosModeracaoService;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Exclusão definitiva de conta, para atender pedidos de eliminação de dados (LGPD, art. 18, VI).
 * <p>
 * Apaga a conta e tudo o que é dela: anúncios (com fotos, contatos recebidos, favoritos, visitas e denúncias contra
 * eles), contatos enviados, favoritos, tokens de API, notificações, aceites de termos e avisos, foto e capa do perfil.
 * As denúncias que a pessoa fez contra anúncios de terceiros continuam no histórico de moderação, anonimizadas.
 * A sessão aberta cai na próxima requisição ({@code ContaAtivaFilter}).
 * <p>
 * Diferente de desativar ({@link UsuarioService#excluir}), não há como desfazer. Pode partir do administrador ou de um
 * pedido do próprio usuário, executado depois do prazo de espera.
 */
@Service
public class ExclusaoContaService {

    private static final Logger log = LoggerFactory.getLogger(ExclusaoContaService.class);

    private final UsuarioRepository usuarios;
    private final ImovelService imoveis;
    private final ExclusaoDadosModeracaoService moderacao;
    private final UploadService uploads;
    private final SolicitacaoExclusaoRepository solicitacoes;

    public ExclusaoContaService(UsuarioRepository usuarios, ImovelService imoveis,
            ExclusaoDadosModeracaoService moderacao, UploadService uploads, SolicitacaoExclusaoRepository solicitacoes) {
        this.usuarios = usuarios;
        this.imoveis = imoveis;
        this.moderacao = moderacao;
        this.uploads = uploads;
        this.solicitacoes = solicitacoes;
    }

    /** Pelo administrador, em /admin/usuarios. */
    @Transactional
    public void excluirDefinitivamente(Long id, AuthUser admin) {
        if (id.equals(admin.id())) {
            throw new BusinessException("Você não pode excluir a própria conta");
        }
        Usuario u = usuarios.findById(id).orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        apagar(u);
        log.info("Conta {} excluída definitivamente pelo administrador {}", id, admin.id());
    }

    /**
     * Pedido do próprio usuário, na tarefa das 03:00 ({@link SolicitacaoExclusaoService}).
     *
     * @return false se a conta já não existia (apagada antes pelo administrador)
     */
    @Transactional
    public boolean excluirAPedido(Long id) {
        return usuarios.findById(id).map(u -> {
            apagar(u);
            log.info("Conta {} excluída definitivamente a pedido do próprio usuário", id);
            return true;
        }).orElse(false);
    }

    private void apagar(Usuario u) {
        Long id = u.getId();

        // denúncias primeiro: as dos anúncios dela impediriam apagar os anúncios
        List<Path> arquivos = new ArrayList<>(moderacao.apagarDadosDoUsuario(id, imoveis.idsDoAnunciante(id)));
        List<String> fotos = imoveis.apagarDadosDoUsuario(id);
        Stream.concat(fotos.stream(), Stream.of(u.getFotoUrl(), u.getCapaUrl()))
                .flatMap(url -> uploads.arquivoLocal(url).stream())
                .forEach(arquivos::add);

        usuarios.delete(u);
        usuarios.flush();
        // pedido de remoção em andamento (se houver) fica registrado como atendido, sem dados pessoais
        solicitacoes.findByUsuarioIdAndCanceladaEmIsNullAndExecutadaEmIsNull(id)
                .ifPresent(s -> s.setExecutadaEm(java.time.Instant.now()));
        apagarArquivosDepoisDoCommit(arquivos);
    }

    /** Se a transação falhar, os arquivos continuam lá, junto com os registros que apontam para eles. */
    private static void apagarArquivosDepoisDoCommit(List<Path> arquivos) {
        if (arquivos.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (Path p : arquivos) {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException e) {
                        log.warn("Não foi possível apagar o arquivo {} da conta excluída: {}", p.getFileName(), e.getMessage());
                    }
                }
            }
        });
    }
}
