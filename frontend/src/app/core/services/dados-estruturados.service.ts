import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Configuracao, ImovelDetalhe, TipoImovel } from '@/app/core/models/models';
import { ConfigService } from './config.service';
import { slug } from '@/app/core/pipes/formatos';

/**
 * Dados estruturados (JSON-LD do schema.org) para os buscadores: o Google lê o script e pode mostrar preço, fotos e
 * endereço do imóvel nos resultados. Cada página põe o seu bloco ao abrir e tira ao sair. Depende da regra
 * "Sitemap e dados estruturados" (aba Regras).
 */
@Injectable({ providedIn: 'root' })
export class DadosEstruturadosService {
    private doc = inject(DOCUMENT);
    private config = inject(ConfigService);

    /** Põe (ou troca) o bloco {@code id}; com {@code dados} nulo ou a regra desligada, só remove. */
    definir(id: string, dados: object | null) {
        this.remover(id);
        if (!dados || this.config.config().sitemapSeo === false) return;
        const script = this.doc.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'ld-' + id;
        // "<" escapado: o texto do anúncio não pode fechar a tag <script>
        script.textContent = JSON.stringify(dados).replace(/</g, '\\u003c');
        this.doc.head.appendChild(script);
    }

    remover(id: string) {
        this.doc.getElementById('ld-' + id)?.remove();
    }
}

/** Endereço absoluto (imagens e páginas precisam de URL completa no schema.org). */
function absoluta(url: string, origem: string): string {
    return /^https?:\/\//i.test(url) ? url : origem + (url.startsWith('/') ? '' : '/') + url;
}

const APARTAMENTOS: TipoImovel[] = ['APARTAMENTO', 'COBERTURA', 'KITNET', 'FLAT'];

/** Tipo do schema.org mais próximo do tipo do imóvel. */
function tipoSchema(t: TipoImovel): string {
    if (APARTAMENTOS.includes(t)) return 'Apartment';
    if (t.startsWith('CASA')) return 'House';
    return 'Place';
}

/** Anúncio como RealEstateListing (oferta de venda ou aluguel + o imóvel com endereço, área e cômodos). */
export function imovelJsonLd(i: ImovelDetalhe, origem: string): object {
    const url = `${origem}/imovel/${i.id}/${slug(i.titulo)}`;
    const imovel: Record<string, unknown> = {
        '@type': tipoSchema(i.tipo),
        name: i.titulo,
        address: {
            '@type': 'PostalAddress',
            streetAddress: [i.endereco, i.numero].filter(Boolean).join(', ') || undefined,
            addressLocality: i.cidade,
            addressRegion: i.uf,
            postalCode: i.cep || undefined,
            addressCountry: 'BR'
        }
    };
    if (i.latitude != null && i.longitude != null) imovel['geo'] = { '@type': 'GeoCoordinates', latitude: i.latitude, longitude: i.longitude };
    if (i.areaUtil) imovel['floorSize'] = { '@type': 'QuantitativeValue', value: i.areaUtil, unitCode: 'MTK' };
    if (i.quartos != null) imovel['numberOfBedrooms'] = i.quartos;
    if (i.banheiros != null) imovel['numberOfBathroomsTotal'] = i.banheiros;
    return {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: i.titulo,
        description: i.descricao
            ? i.descricao
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 500)
            : undefined,
        url,
        image: i.fotos.map((f) => absoluta(f.url, origem)).slice(0, 10),
        datePosted: i.criadoEm,
        dateModified: i.atualizadoEm,
        offers: {
            '@type': 'Offer',
            price: i.preco,
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
            businessFunction: i.finalidade === 'VENDA' ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut',
            url
        },
        mainEntity: imovel
    };
}

/** O site (com a busca, para a caixa de pesquisa do Google) e a organização (nome, logo, contato e redes). */
export function siteJsonLd(c: Configuracao, origem: string): object {
    const redes = [c.instagram, c.facebook].filter((r): r is string => !!r);
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                name: c.nomeApp,
                url: origem + '/',
                description: c.seoDescricao || undefined,
                inLanguage: 'pt-BR',
                potentialAction: { '@type': 'SearchAction', target: `${origem}/venda?q={search_term_string}`, 'query-input': 'required name=search_term_string' }
            },
            {
                '@type': 'Organization',
                name: c.nomeApp,
                url: origem + '/',
                logo: c.logoUrl ? absoluta(c.logoUrl, origem) : undefined,
                email: c.emailContato || undefined,
                telephone: c.telefoneContato || undefined,
                sameAs: redes.length ? redes : undefined
            }
        ]
    };
}
