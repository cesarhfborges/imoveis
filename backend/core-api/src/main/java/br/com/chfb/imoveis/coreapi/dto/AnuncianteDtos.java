package br.com.chfb.imoveis.coreapi.dto;

import java.math.BigDecimal;
import java.time.Instant;

/** Dados públicos de corretores e imobiliárias: diretório (/imobiliarias) e perfil (/anunciante/{id}). */
public final class AnuncianteDtos {

    private AnuncianteDtos() {
    }

    /** Item do diretório (lista + marcador no mapa). @param tipo CORRETOR ou IMOBILIARIA */
    public record AnuncianteResumo(Long id, String nome, String tipo, String fotoUrl, String creci, String creciUf,
            String bairro, String cidade, String uf, BigDecimal latitude, BigDecimal longitude, long totalAnuncios) {
    }

    /**
     * Perfil público. O telefone segue Configurações > "Telefone do anunciante": com telefoneCompleto = false vem só
     * o início (ou nulo, se oculto) e o WhatsApp não vem; o número completo sai em GET /{id}/telefone.
     */
    public record AnunciantePerfil(Long id, String nome, String tipo, String razaoSocial, String fotoUrl, String capaUrl, String creci,
            String creciUf, String sobre, String regioesAtuacao, Short atuandoDesde, String site, String instagram,
            String facebook, String emailContato, String telefone, boolean telefoneCompleto, String whatsapp,
            String cep, String logradouro, String numero, String complemento, String bairro, String cidade, String uf,
            BigDecimal latitude, BigDecimal longitude, Instant membroDesde, long totalAnuncios) {
    }

    /** Resposta do botão "Ver telefone" do perfil. */
    public record ContatoAnunciante(String telefone, String whatsapp) {
    }
}
