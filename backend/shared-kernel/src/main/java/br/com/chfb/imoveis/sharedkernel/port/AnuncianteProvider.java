package br.com.chfb.imoveis.sharedkernel.port;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Porta para o módulo de anúncios obter dados públicos do anunciante
 * sem depender das entidades do módulo de contas (implementada no core-api).
 */
public interface AnuncianteProvider {

    Optional<AnuncianteInfo> buscar(Long usuarioId);

    Map<Long, AnuncianteInfo> buscarTodos(Collection<Long> usuarioIds);

    /** @param perfilPublico anunciante ativo com o perfil público ligado (/anunciante/{id}) */
    record AnuncianteInfo(Long id, String nome, String email, String telefone, String creci, String fotoUrl,
            boolean perfilPublico) {
    }
}
