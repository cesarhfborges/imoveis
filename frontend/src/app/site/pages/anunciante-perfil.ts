import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { AnunciantePerfil, ImovelResumo } from '@/app/core/models/models';
import { AnuncianteService } from '@/app/core/services/anunciante.service';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { TelefoneAnuncianteService } from '@/app/core/services/telefone-anunciante.service';
import { CepPipe, PrecoPipe, digitos, slug } from '@/app/core/pipes/formatos';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { TelefoneAnunciante } from '@/app/shared/components/telefone-anunciante';
import { EmptyState } from '@/app/shared/components/empty-state';
import { iniciaisDe } from '@/app/shared/components/avatar';

const POR_PAGINA = 12;

/** /anunciante/:id/:slug — perfil público de corretor ou imobiliária, com contato, endereço no mapa e anúncios. */
@Component({
    selector: 'app-anunciante-perfil-page',
    imports: [DatePipe, RouterLink, SkeletonModule, MapaOsm, ImovelCardMini, TelefoneAnunciante, EmptyState, CepPipe],
    template: `
        <div class="site-container py-4">
            <nav class="text-sm mb-3" aria-label="Você está em">
                <a routerLink="/imobiliarias" class="text-primary hover:underline"><i class="pi pi-arrow-left mr-1 text-xs" aria-hidden="true"></i>Imobiliárias e corretores</a>
            </nav>

            @if (naoEncontrado()) {
                <app-empty-state titulo="Perfil não encontrado" texto="Este perfil não existe ou não está mais público." icone="pi-user-minus">
                    <a routerLink="/imobiliarias" class="botao-contorno">Ver imobiliárias e corretores</a>
                </app-empty-state>
            } @else if (!perfil()) {
                <p-skeleton height="12rem" styleClass="mb-4" />
                <p-skeleton height="20rem" />
            } @else {
                @let p = perfil()!;
                <!-- cabeçalho -->
                <section class="perfil-pub__topo" aria-labelledby="perfil-nome">
                    <div class="perfil-pub__foto" aria-hidden="true">
                        @if (p.fotoUrl && !fotoFalhou()) {
                            <img [src]="p.fotoUrl" alt="" (error)="fotoFalhou.set(true)" />
                        } @else {
                            {{ iniciais() }}
                        }
                    </div>
                    <div class="perfil-pub__ident">
                        <span class="pilula">{{ p.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor de imóveis' }}</span>
                        <h1 id="perfil-nome" class="perfil-pub__nome">{{ p.nome }}</h1>
                        @if (p.razaoSocial) {
                            <div class="text-sm text-muted-color">{{ p.razaoSocial }}</div>
                        }
                        <ul class="perfil-pub__fatos">
                            @if (p.creci) {
                                <li><i class="pi pi-id-card" aria-hidden="true"></i>CRECI {{ p.creci }}{{ p.creciUf ? '-' + p.creciUf : '' }}</li>
                            }
                            @if (p.cidade) {
                                <li><i class="pi pi-map-marker" aria-hidden="true"></i>{{ p.bairro ? p.bairro + ', ' : '' }}{{ p.cidade }}/{{ p.uf }}</li>
                            }
                            @if (anos()) {
                                <li><i class="pi pi-briefcase" aria-hidden="true"></i>{{ anos() }} {{ anos() === 1 ? 'ano' : 'anos' }} de atuação</li>
                            }
                            <li><i class="pi pi-calendar" aria-hidden="true"></i>No portal desde {{ p.membroDesde | date: 'MM/yyyy' }}</li>
                        </ul>
                    </div>
                    <div class="perfil-pub__numero" [attr.aria-label]="p.totalAnuncios + ' imóveis anunciados'">
                        <strong>{{ p.totalAnuncios }}</strong>
                        <span>{{ p.totalAnuncios === 1 ? 'imóvel anunciado' : 'imóveis anunciados' }}</span>
                    </div>
                </section>

                <div class="perfil-pub">
                    <div class="perfil-pub__principal">
                        @if (p.sobre) {
                            <section class="painel-lateral" aria-labelledby="perfil-sobre">
                                <h2 id="perfil-sobre" class="perfil-pub__titulo">Sobre</h2>
                                <p class="perfil-pub__sobre">{{ p.sobre }}</p>
                                @if (regioes().length) {
                                    <h3 class="perfil-pub__subtitulo">Regiões de atuação</h3>
                                    <ul class="list-none m-0 p-0 flex flex-wrap gap-2">
                                        @for (r of regioes(); track r) {
                                            <li class="pilula">{{ r }}</li>
                                        }
                                    </ul>
                                }
                            </section>
                        }

                        @if (pontosImoveis().length) {
                            <!-- só os imóveis deste anunciante, enquadrados no mapa -->
                            <section class="painel-lateral" aria-labelledby="perfil-mapa">
                                <h2 id="perfil-mapa" class="perfil-pub__titulo">Onde estão os imóveis</h2>
                                <p class="text-sm text-muted-color mt-0 mb-3">{{ pontosImoveis().length }} {{ pontosImoveis().length === 1 ? 'imóvel' : 'imóveis' }} no mapa. Clique num pino para ver o preço e abrir o anúncio.</p>
                                <app-mapa-osm [pontos]="pontosImoveis()" altura="360px" />
                            </section>
                        }

                        <section aria-labelledby="perfil-anuncios">
                            <h2 id="perfil-anuncios" class="perfil-pub__titulo">Imóveis de {{ p.nome }}</h2>
                            @if (carregandoImoveis() && !imoveis().length) {
                                <div class="perfil-pub__grade">
                                    @for (i of [1, 2, 3]; track i) {
                                        <p-skeleton height="260px" />
                                    }
                                </div>
                            } @else if (!imoveis().length) {
                                <app-empty-state titulo="Nenhum imóvel no ar" texto="Este anunciante não tem anúncios publicados no momento." icone="pi-home" />
                            } @else {
                                <div class="perfil-pub__grade">
                                    @for (i of imoveis(); track i.id) {
                                        <app-imovel-card-mini [imovel]="i" />
                                    }
                                </div>
                                @if (temMais()) {
                                    <div class="flex justify-center mt-4">
                                        <button type="button" class="botao-contorno botao-contorno--grande" [disabled]="carregandoImoveis()" (click)="carregarMais()">
                                            <i [class]="carregandoImoveis() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'" aria-hidden="true"></i> Ver mais imóveis
                                        </button>
                                    </div>
                                }
                            }
                        </section>
                    </div>

                    <aside class="perfil-pub__lado" aria-label="Contato e endereço">
                        <section class="painel-lateral flex flex-col gap-3" aria-labelledby="perfil-contato">
                            <h2 id="perfil-contato" class="perfil-pub__titulo m-0">Contato</h2>
                            <app-telefone-anunciante [anuncianteId]="p.id" [anunciante]="p" />
                            @if (whatsapp(); as w) {
                                <a [href]="'https://wa.me/55' + w" target="_blank" rel="noopener" class="perfil-pub__acao perfil-pub__acao--whats"><i class="pi pi-whatsapp" aria-hidden="true"></i> Conversar no WhatsApp<span class="sr-only"> (abre em nova aba)</span></a>
                            }
                            @if (p.emailContato) {
                                <a [href]="'mailto:' + p.emailContato" class="perfil-pub__acao"><i class="pi pi-envelope" aria-hidden="true"></i> {{ p.emailContato }}</a>
                            }
                            @if (p.site || p.instagram || p.facebook) {
                                <div class="flex flex-wrap gap-2">
                                    @if (p.site) {
                                        <a [href]="p.site" target="_blank" rel="noopener" class="botao-contorno"><i class="pi pi-globe" aria-hidden="true"></i> Site<span class="sr-only"> (abre em nova aba)</span></a>
                                    }
                                    @if (p.instagram) {
                                        <a [href]="'https://instagram.com/' + p.instagram" target="_blank" rel="noopener" class="botao-contorno"><i class="pi pi-instagram" aria-hidden="true"></i> Instagram<span class="sr-only"> (abre em nova aba)</span></a>
                                    }
                                    @if (p.facebook) {
                                        <a [href]="linkFacebook(p.facebook)" target="_blank" rel="noopener" class="botao-contorno"><i class="pi pi-facebook" aria-hidden="true"></i> Facebook<span class="sr-only"> (abre em nova aba)</span></a>
                                    }
                                </div>
                            }
                        </section>

                        <section class="painel-lateral flex flex-col gap-3" aria-labelledby="perfil-endereco">
                            <h2 id="perfil-endereco" class="perfil-pub__titulo m-0">{{ p.tipo === 'IMOBILIARIA' ? 'Onde estamos' : 'Endereço comercial' }}</h2>
                            <address class="not-italic text-sm leading-relaxed">
                                {{ p.logradouro }}{{ p.numero ? ', ' + p.numero : '' }}{{ p.complemento ? ' · ' + p.complemento : '' }}<br />
                                {{ p.bairro }} · {{ p.cidade }}/{{ p.uf }}
                                @if (p.cep) {
                                    <br />CEP {{ p.cep | cep }}
                                }
                            </address>
                            @if (ponto().length) {
                                <app-mapa-osm [pontos]="ponto()" [cliqueParaCarregar]="true" altura="220px" />
                            }
                        </section>
                    </aside>
                </div>
            }
        </div>
    `,
    styles: `
        .perfil-pub__topo {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 1.25rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
            border: 1px solid var(--site-borda);
            border-radius: var(--site-raio);
            background: linear-gradient(135deg, color-mix(in srgb, var(--p-primary-color), transparent 90%), var(--site-cartao) 60%);
        }
        .perfil-pub__foto {
            flex: none;
            display: grid;
            place-items: center;
            width: 6rem;
            height: 6rem;
            border-radius: 999px;
            overflow: hidden;
            font-size: 2rem;
            font-weight: 700;
            color: var(--p-primary-contrast-color);
            background: var(--p-primary-color);
            border: 3px solid var(--site-cartao);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }
        .perfil-pub__foto img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .perfil-pub__ident {
            flex: 1;
            min-width: 14rem;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.3rem;
        }
        .perfil-pub__nome {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--p-primary-color);
            line-height: 1.2;
        }
        .perfil-pub__fatos {
            list-style: none;
            margin: 0.25rem 0 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem 1rem;
            font-size: 0.85rem;
            color: var(--p-text-muted-color);
        }
        .perfil-pub__fatos i {
            margin-right: 0.35rem;
        }
        .perfil-pub__numero {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.6rem 1rem;
            border-radius: var(--site-raio);
            background: var(--site-cartao);
            border: 1px solid var(--site-borda);
            line-height: 1.15;
            font-size: 0.75rem;
            color: var(--p-text-muted-color);
            text-align: center;
        }
        .perfil-pub__numero strong {
            font-size: 1.6rem;
            color: var(--p-primary-color);
        }
        .perfil-pub {
            display: grid;
            gap: 1rem;
            grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 992px) {
            .perfil-pub {
                grid-template-columns: minmax(0, 1fr) 22rem;
                align-items: start;
            }
            .perfil-pub__lado {
                position: sticky;
                top: calc(var(--cabecalho-altura, 4rem) + 1rem);
            }
        }
        .perfil-pub__principal,
        .perfil-pub__lado {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 0;
        }
        .perfil-pub__titulo {
            font-size: 1.05rem;
            font-weight: 700;
            margin: 0 0 0.75rem;
        }
        .perfil-pub__subtitulo {
            font-size: 0.9rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem;
        }
        .perfil-pub__sobre {
            margin: 0;
            white-space: pre-line;
            line-height: 1.6;
        }
        .perfil-pub__grade {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        }
        .perfil-pub__acao {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.55rem 0.75rem;
            border: 1px solid var(--site-borda);
            border-radius: var(--site-raio);
            color: var(--p-text-color);
            text-decoration: none;
            font-size: 0.9rem;
            overflow-wrap: anywhere;
        }
        .perfil-pub__acao:hover {
            border-color: var(--p-primary-color);
            color: var(--p-primary-color);
        }
        .perfil-pub__acao--whats {
            justify-content: center;
            font-weight: 600;
            color: #fff;
            background: var(--site-verde, #15803d);
            border-color: var(--site-verde, #15803d);
        }
        .perfil-pub__acao--whats:hover {
            color: #fff;
            filter: brightness(0.95);
        }
    `
})
export class AnunciantePerfilPage {
    private route = inject(ActivatedRoute);
    private anunciantes = inject(AnuncianteService);
    private imoveisApi = inject(ImovelService);
    private config = inject(ConfigService);
    private revelados = inject(TelefoneAnuncianteService);

    perfil = signal<AnunciantePerfil | null>(null);
    naoEncontrado = signal(false);
    fotoFalhou = signal(false);
    imoveis = signal<ImovelResumo[]>([]);
    carregandoImoveis = signal(false);
    private pagina = 0;
    private totalPaginas = 0;
    temMais = signal(false);
    /** Todos os imóveis no ar do anunciante com posição (o mapa não pagina). */
    private imoveisMapa = signal<ImovelResumo[]>([]);
    private preco = new PrecoPipe();
    pontosImoveis = computed<PontoMapa[]>(() =>
        this.imoveisMapa()
            .filter((i) => i.latitude != null && i.longitude != null)
            .map((i) => ({
                id: i.id,
                lat: i.latitude!,
                lng: i.longitude!,
                titulo: i.titulo,
                subtitulo: `${i.bairro}, ${i.cidade}`,
                preco: this.preco.transform(i.preco, i.finalidade),
                link: `/imovel/${i.id}/${slug(i.titulo)}`
            }))
    );

    iniciais = computed(() => iniciaisDe(this.perfil()?.nome));
    anos = computed(() => {
        const d = this.perfil()?.atuandoDesde;
        return d ? Math.max(new Date().getFullYear() - d, 0) || null : null;
    });
    regioes = computed(() => (this.perfil()?.regioesAtuacao ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    /** WhatsApp: vem no perfil quando o telefone pode aparecer completo, ou depois do "Ver telefone". */
    whatsapp = computed(() => {
        const p = this.perfil();
        if (!p) return null;
        return digitos(p.whatsapp) || this.revelados.whatsapp({ tipo: 'anunciante', id: p.id })() || null;
    });
    ponto = computed<PontoMapa[]>(() => {
        const p = this.perfil();
        if (!p || p.latitude == null || p.longitude == null) return [];
        return [{ id: p.id, lat: p.latitude, lng: p.longitude, titulo: p.nome, subtitulo: [p.logradouro, p.numero].filter(Boolean).join(', ') }];
    });

    constructor() {
        this.route.paramMap.subscribe((pm) => this.carregar(Number(pm.get('id'))));
        effect(() => {
            const p = this.perfil();
            if (p) this.config.definirTitulo(`${p.nome} · ${p.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor'}`);
        });
    }

    private carregar(id: number) {
        this.perfil.set(null);
        this.naoEncontrado.set(false);
        this.fotoFalhou.set(false);
        this.imoveis.set([]);
        this.imoveisMapa.set([]);
        this.pagina = 0;
        this.anunciantes.perfil(id).subscribe({
            next: (p) => {
                this.perfil.set(p);
                this.buscarImoveis();
                this.imoveisApi.mapa({ anunciante: p.id }).subscribe({ next: (l) => this.imoveisMapa.set(l), error: () => this.imoveisMapa.set([]) });
            },
            error: () => this.naoEncontrado.set(true)
        });
    }

    carregarMais() {
        this.pagina++;
        this.buscarImoveis();
    }

    private buscarImoveis() {
        const p = this.perfil();
        if (!p) return;
        this.carregandoImoveis.set(true);
        this.imoveisApi.buscar({ anunciante: p.id, ordem: 'recentes', page: this.pagina, size: POR_PAGINA }).subscribe({
            next: (r) => {
                this.imoveis.update((l) => [...l, ...r.content]);
                this.totalPaginas = r.totalPages;
                this.temMais.set(this.pagina + 1 < this.totalPaginas);
                this.carregandoImoveis.set(false);
            },
            error: () => this.carregandoImoveis.set(false)
        });
    }

    linkFacebook(f: string): string {
        return /^https?:\/\//i.test(f) ? f : `https://facebook.com/${f.replace(/^(www\.)?facebook\.com\//i, '')}`;
    }

}
