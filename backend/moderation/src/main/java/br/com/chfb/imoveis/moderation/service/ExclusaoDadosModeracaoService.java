package br.com.chfb.imoveis.moderation.service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.moderation.entity.Denuncia;
import br.com.chfb.imoveis.moderation.entity.DenunciaMensagem;
import br.com.chfb.imoveis.moderation.repository.AnexoDenunciaRepository;
import br.com.chfb.imoveis.moderation.repository.DenunciaRepository;

/**
 * Parte da moderação na exclusão definitiva de uma conta (LGPD):
 * <ul>
 * <li>denúncias contra os anúncios da pessoa são apagadas, com mensagens e anexos (os anúncios também serão);</li>
 * <li>denúncias que a pessoa fez contra outros anúncios continuam no histórico, sem o denunciante;</li>
 * <li>mensagens dela em outras denúncias (como moderadora) ficam sem autor e sem anexos;</li>
 * <li>anexos que ela enviou são apagados.</li>
 * </ul>
 * Os arquivos só podem ser apagados depois do commit, por isso voltam como lista para quem chamou.
 */
@Service
public class ExclusaoDadosModeracaoService {

    private final DenunciaRepository denuncias;
    private final AnexoDenunciaRepository anexos;
    private final AnexoService anexoService;

    public ExclusaoDadosModeracaoService(DenunciaRepository denuncias, AnexoDenunciaRepository anexos,
            AnexoService anexoService) {
        this.denuncias = denuncias;
        this.anexos = anexos;
        this.anexoService = anexoService;
    }

    /**
     * @param imoveisDaPessoa anúncios da pessoa, que serão apagados em seguida
     * @return arquivos de anexos a apagar depois do commit
     */
    @Transactional
    public List<Path> apagarDadosDoUsuario(Long usuarioId, Collection<Long> imoveisDaPessoa) {
        Set<String> nomes = new LinkedHashSet<>();
        for (Long imovelId : imoveisDaPessoa) {
            for (Denuncia d : denuncias.findByImovelIdOrderByCriadoEmAsc(imovelId)) {
                d.getMensagens().forEach(m -> nomes.addAll(anexosDa(m)));
            }
            denuncias.deleteByImovelId(imovelId);
        }
        anexos.findByUsuarioId(usuarioId).forEach(a -> nomes.add(a.getNome()));
        denuncias.flush();
        denuncias.anonimizarMensagens(usuarioId);
        denuncias.anonimizarDenunciante(usuarioId);

        List<Path> arquivos = new ArrayList<>();
        for (String nome : nomes) {
            anexos.findById(nome).ifPresent(anexos::delete);
            arquivos.add(anexoService.caminho(nome));
        }
        anexos.flush();
        return arquivos;
    }

    /** Nomes dos arquivos citados numa mensagem (uma URL de anexo por linha). */
    static List<String> anexosDa(DenunciaMensagem m) {
        List<String> nomes = new ArrayList<>();
        if (m.getAnexos() == null) {
            return nomes;
        }
        for (String url : m.getAnexos().split("\n")) {
            Matcher x = AnexoService.URL.matcher(url.strip());
            if (x.matches()) {
                nomes.add(x.group(1));
            }
        }
        return nomes;
    }
}
