package br.com.chfb.imoveis.listing.service;

import java.util.Objects;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.ContatoDto;
import br.com.chfb.imoveis.listing.dto.ContatoForm;
import br.com.chfb.imoveis.listing.entity.Contato;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.repository.ContatoRepository;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

@Service
public class ContatoService {

    private final ContatoRepository contatos;
    private final ImovelRepository imoveis;

    public ContatoService(ContatoRepository contatos, ImovelRepository imoveis) {
        this.contatos = contatos;
        this.imoveis = imoveis;
    }

    @Transactional
    public ContatoDto enviar(Long imovelId, ContatoForm form, AuthUser usuario) {
        Imovel imovel = imoveis.findById(imovelId).filter(i -> i.getStatus() == StatusAnuncio.ATIVO)
                .orElseThrow(() -> new NotFoundException("Imóvel não encontrado"));
        Contato c = new Contato();
        c.setImovel(imovel);
        c.setNome(form.nome().trim());
        c.setEmail(form.email().trim());
        c.setTelefone(form.telefone());
        c.setMensagem(form.mensagem().trim());
        c.setUsuarioId(usuario == null ? null : usuario.id());
        return ContatoDto.of(contatos.save(c));
    }

    @Transactional(readOnly = true)
    public PageResponse<ContatoDto> listar(AuthUser usuario, int page, int size) {
        PageRequest pagina = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        if (usuario.isAdmin()) {
            return PageResponse.of(contatos.findAllByOrderByCriadoEmDesc(pagina), ContatoDto::of);
        }
        return PageResponse.of(contatos.findByImovelAnuncianteIdOrderByCriadoEmDesc(usuario.id(), pagina), ContatoDto::of);
    }

    @Transactional
    public ContatoDto marcarLido(Long id, boolean lido, AuthUser usuario) {
        Contato c = contatos.findById(id).orElseThrow(() -> new NotFoundException("Contato não encontrado"));
        if (!usuario.isAdmin() && !Objects.equals(c.getImovel().getAnuncianteId(), usuario.id())) {
            throw new ForbiddenException("Contato de outro anunciante");
        }
        c.setLido(lido);
        return ContatoDto.of(c);
    }
}
