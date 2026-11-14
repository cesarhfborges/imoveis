import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ThemeService } from './theme.service';
import { Configuracao } from '@/app/core/models/models';

export const CONFIG_PADRAO: Configuracao = {
    nomeApp: 'Imóveis',
    slogan: 'Buscou, encontrou!',
    logoUrl: null,
    logoEscuroUrl: null,
    faviconUrl: null,
    seoTitulo: 'Imóveis - compra, venda e aluguel',
    seoDescricao: 'Portal de imóveis para comprar, vender e alugar.',
    seoPalavrasChave: 'imóveis, apartamentos, casas, aluguel, venda',
    seoImagemUrl: null,
    emailContato: 'contato@exemplo.com',
    telefoneContato: '(61) 0000-0000',
    whatsapp: '(61) 90000-0000',
    endereco: null,
    instagram: null,
    facebook: null,
    textoRodape: 'Encontrar o lar certo deve ser simples. Reunimos imóveis de corretores e imobiliárias em um só lugar.',
    temaPreset: 'Aura',
    temaPrimaria: 'marinho',
    temaSurface: null,
    temaModo: 'auto',
    moderarAnuncios: false,
    permitirCadastroCorretor: true
};

/** Configuração global (nome, logos, SEO e tema) definida em /admin/configuracoes. */
@Injectable({ providedIn: 'root' })
export class ConfigService {
    private api = inject(ApiService);
    private theme = inject(ThemeService);
    private title = inject(Title);
    private meta = inject(Meta);
    private doc = inject(DOCUMENT);

    readonly config = signal<Configuracao>(CONFIG_PADRAO);

    async carregar(): Promise<void> {
        const c = await firstValueFrom(this.api.get<Configuracao>('/app/public/configuracao').pipe(catchError(() => of(CONFIG_PADRAO))));
        this.aplicar(c ?? CONFIG_PADRAO);
    }

    salvar(c: Configuracao): Observable<Configuracao> {
        return this.api.put<Configuracao>('/app/admin/configuracao', c).pipe(tap((x) => this.aplicar(x)));
    }

    aplicar(c: Configuracao) {
        this.config.set({ ...CONFIG_PADRAO, ...c });
        this.theme.initFromSite({ preset: c.temaPreset, primary: c.temaPrimaria, surface: c.temaSurface, mode: c.temaModo });
        this.definirTitulo();
        this.meta.updateTag({ name: 'description', content: c.seoDescricao ?? '' });
        this.meta.updateTag({ name: 'keywords', content: c.seoPalavrasChave ?? '' });
        this.meta.updateTag({ property: 'og:title', content: c.seoTitulo ?? c.nomeApp });
        this.meta.updateTag({ property: 'og:description', content: c.seoDescricao ?? '' });
        if (c.seoImagemUrl) {
            this.meta.updateTag({ property: 'og:image', content: c.seoImagemUrl });
        }
        if (c.faviconUrl) {
            let link = this.doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
            if (!link) {
                link = this.doc.createElement('link');
                link.rel = 'icon';
                this.doc.head.appendChild(link);
            }
            link.href = c.faviconUrl;
        }
    }

    /** Título da aba: "Página | Nome do app" ou o título de SEO na página inicial. */
    definirTitulo(pagina?: string) {
        const c = this.config();
        this.title.setTitle(pagina ? `${pagina} | ${c.nomeApp}` : c.seoTitulo || c.nomeApp);
    }
}
