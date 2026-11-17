package br.com.chfb.imoveis.listing.service;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.chfb.imoveis.listing.dto.ContatoDto;
import br.com.chfb.imoveis.listing.dto.ContatoForm;
import br.com.chfb.imoveis.listing.dto.EtapaContatoForm;
import br.com.chfb.imoveis.listing.entity.EtapaContato;
import br.com.chfb.imoveis.sharedkernel.port.RecursosSitePolicy;
import br.com.chfb.imoveis.listing.entity.Contato;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.repository.ContatoRepository;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.dto.PageResponse;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.port.Notificador;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;

@Service
public class ContatoService {

    private final ContatoRepository contatos;
    private final ImovelRepository imoveis;
    private final Notificador notificador;
    private final RecursosSitePolicy recursos;

    public ContatoService(ContatoRepository contatos, ImovelRepository imoveis, Notificador notificador,
            RecursosSitePolicy recursos) {
        this.contatos = contatos;
        this.imoveis = imoveis;
        this.notificador = notificador;
        this.recursos = recursos;
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
        Contato salvo = contatos.save(c);
        notificador.notificar(new Notificador.Nova(imovel.getAnuncianteId(), "CONTATO_RECEBIDO",
                "Novo contato de " + salvo.getNome(), "Sobre o anúncio " + imovel.getCodigo() + ": " + imovel.getTitulo(),
                "pi-inbox", "/conta/contatos", "CONTATO", salvo.getId()));
        return ContatoDto.of(salvo);
    }

    /**
     * Contatos dos anúncios do próprio usuário. Vale também para administradores: o contato é um dado
     * pessoal de quem escreveu, endereçado ao anunciante, e não deve ser lido por terceiros (LGPD).
     */
    @Transactional(readOnly = true)
    public PageResponse<ContatoDto> listar(AuthUser usuario, EtapaContato etapa, int page, int size) {
        PageRequest pagina = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        // com a regra desligada o filtro por etapa não vale (a tela nem mostra as etapas)
        return PageResponse.of(etapa != null && recursos.etapasContatos()
                ? contatos.findByImovelAnuncianteIdAndEtapaOrderByCriadoEmDesc(usuario.id(), etapa, pagina)
                : contatos.findByImovelAnuncianteIdOrderByCriadoEmDesc(usuario.id(), pagina), ContatoDto::of);
    }

    /** Quantos contatos o anunciante tem em cada etapa (todas as etapas, mesmo as vazias). */
    @Transactional(readOnly = true)
    public Map<EtapaContato, Long> contarPorEtapa(AuthUser usuario) {
        Map<EtapaContato, Long> mapa = new EnumMap<>(EtapaContato.class);
        for (EtapaContato e : EtapaContato.values()) {
            mapa.put(e, 0L);
        }
        contatos.contarPorEtapa(usuario.id()).forEach(l -> mapa.put((EtapaContato) l[0], (Long) l[1]));
        return mapa;
    }

    /** Muda a etapa (e as anotações); sair de "Novo" marca o contato como lido. */
    @Transactional
    public ContatoDto mudarEtapa(Long id, EtapaContatoForm form, AuthUser usuario) {
        if (!recursos.etapasContatos()) {
            throw new ForbiddenException("As etapas dos contatos estão desativadas no momento");
        }
        Contato c = doAnunciante(id, usuario);
        if (c.getEtapa() != form.etapa()) {
            c.setEtapa(form.etapa());
            c.setEtapaEm(Instant.now());
        }
        String notas = form.anotacoes() == null ? null : form.anotacoes().strip();
        c.setAnotacoes(notas == null || notas.isEmpty() ? null : notas);
        if (form.etapa() != EtapaContato.NOVO) {
            c.setLido(true);
        }
        return ContatoDto.of(c);
    }

    private Contato doAnunciante(Long id, AuthUser usuario) {
        Contato c = contatos.findById(id).orElseThrow(() -> new NotFoundException("Contato não encontrado"));
        if (!Objects.equals(c.getImovel().getAnuncianteId(), usuario.id())) {
            throw new ForbiddenException("Contato de outro anunciante");
        }
        return c;
    }

    @Transactional
    public ContatoDto marcarLido(Long id, boolean lido, AuthUser usuario) {
        Contato c = doAnunciante(id, usuario);
        c.setLido(lido);
        return ContatoDto.of(c);
    }
}
