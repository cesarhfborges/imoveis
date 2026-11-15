package br.com.chfb.imoveis.moderation.realtime;

import java.util.Objects;

import org.springframework.stereotype.Component;

import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.port.AutorizadorDeCanal;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

/**
 * Sala protegida das pendências de um anúncio ({@code presence-denuncias.imovel.{id}}): entram o dono do
 * anúncio e os administradores. O canal só da moderação ({@code private-admin.*}) é tratado na plataforma.
 */
@Component
public class CanaisDaModeracao implements AutorizadorDeCanal {

    private static final String SALA = "presence-denuncias.imovel.";

    private final ImovelRepository imoveis;

    public CanaisDaModeracao(ImovelRepository imoveis) {
        this.imoveis = imoveis;
    }

    @Override
    public Boolean pode(String canal, AuthUser u) {
        if (!canal.startsWith(SALA)) {
            return null;
        }
        if (u.isAdmin()) {
            return true;
        }
        try {
            Long id = Long.valueOf(canal.substring(SALA.length()));
            return imoveis.findById(id).map(i -> Objects.equals(i.getAnuncianteId(), u.id())).orElse(false);
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
