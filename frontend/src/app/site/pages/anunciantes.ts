import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { SkeletonModule } from 'primeng/skeleton';
import { AnuncianteResumo, TIPOS_ANUNCIANTE, TipoAnunciante } from '@/app/core/models/models';
import { AnuncianteService } from '@/app/core/services/anunciante.service';
import { ConfigService } from '@/app/core/services/config.service';
import { slug } from '@/app/core/pipes/formatos';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { AnuncianteFoto } from '@/app/shared/components/anunciante-foto';
import { EmptyState } from '@/app/shared/components/empty-state';

/** Sem a localização da pessoa, o mapa abre em Taguatinga Sul. */
const TAGUATINGA_SUL: [number, number] = [-15.8445, -48.0565];
/** Zoom amplo (várias regiões à vista): o mapa só aproxima ao selecionar um anunciante. */
const ZOOM_AMPLO = 12;

/** Minúsculas e sem acentos, para a busca: "Águas Claras" → "aguas claras". */
function normalizar(s: string | null | undefined): string {
    return (s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * /imobiliarias: diretório de imobiliárias e corretores com perfil público.
 * Abre com um mapa amplo (na localização da pessoa, se ela permitir; senão em Taguatinga Sul) e nada selecionado.
 * Selecionar um anunciante (na lista, no pino ou na busca) leva o mapa até ele; "Ver perfil" abre a página com os imóveis.
 * Tipo e cidade ficam na URL (?tipo=&cidade=), para compartilhar.
 */
@Component({
    selector: 'app-anunciantes-page',
    imports: [FormsModule, RouterLink, SelectButtonModule, SelectModule, AutoCompleteModule, SkeletonModule, MapaOsm, AnuncianteFoto, EmptyState],
    template: `
        <div class="site-container py-4">
            <header class="diretorio__topo">
                <div>
                    <h1 class="busca__titulo">Imobiliárias e corretores</h1>
                    <p class="text-sm text-muted-color mt-1 mb-0" aria-live="polite">
                        @if (carregando()) {
                            Buscando…
                        } @else {
                            {{ lista().length }} {{ lista().length === 1 ? 'resultado' : 'resultados' }}{{ cidade() ? ' em ' + cidade() : '' }}
                        }
                    </p>
                </div>
                <div class="diretorio__filtros">
                    <p-selectbutton [options]="tipos" optionLabel="label" optionValue="value" [ngModel]="tipo()" (ngModelChange)="mudarTipo($event)" [allowEmpty]="false" ariaLabelledBy="dir-tipo" />
                    <span id="dir-tipo" class="sr-only">Tipo de anunciante</span>
                    <p-select [options]="cidades()" [ngModel]="cidade()" (ngModelChange)="mudarCidade($event)" placeholder="Todas as cidades" [showClear]="true" ariaLabel="Cidade" styleClass="min-w-48" />
                </div>
            </header>

            <!-- busca por nome: filtra a lista enquanto digita; escolher uma sugestão seleciona no mapa -->
            <div class="diretorio__busca" role="search">
                <label for="dir-busca" class="sr-only">Buscar imobiliária ou corretor pelo nome</label>
                <p-autocomplete
                    inputId="dir-busca"
                    [ngModel]="busca()"
                    (ngModelChange)="mudarBusca($event)"
                    [suggestions]="sugestoes()"
                    (completeMethod)="sugerir($event)"
                    (onSelect)="escolher($event)"
                    (onClear)="mudarBusca('')"
                    optionLabel="nome"
                    [delay]="150"
                    [showClear]="true"
                    [forceSelection]="false"
                    placeholder="Buscar imobiliária ou corretor(a) pelo nome, bairro ou CRECI"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                    appendTo="body"
                >
                    <ng-template let-a #item>
                        <div class="flex items-center gap-2 min-w-0">
                            <app-anunciante-foto [nome]="a.nome" [foto]="a.fotoUrl" />
                            <div class="min-w-0">
                                <div class="font-medium truncate">{{ a.nome }}</div>
                                <div class="text-xs text-muted-color truncate">{{ a.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor(a)' }} · {{ local(a) }}</div>
                            </div>
                        </div>
                    </ng-template>
                </p-autocomplete>
                <button type="button" class="botao-contorno diretorio__local" (click)="usarMinhaLocalizacao()" [disabled]="localizando()" title="Centralizar o mapa onde você está">
                    <i [class]="localizando() ? 'pi pi-spin pi-spinner' : 'pi pi-compass'" aria-hidden="true"></i><span class="hidden sm:inline">Perto de mim</span><span class="sm:hidden sr-only">Perto de mim</span>
                </button>
            </div>
            @if (avisoLocal()) {
                <p class="text-xs text-muted-color mt-0 mb-3"><i class="pi pi-info-circle mr-1" aria-hidden="true"></i>{{ avisoLocal() }}</p>
            }

            <div class="diretorio">
                <section class="diretorio__lista" aria-label="Resultados">
                    @if (carregando()) {
                        @for (i of [1, 2, 3, 4]; track i) {
                            <p-skeleton height="5.5rem" />
                        }
                    } @else if (!lista().length) {
                        <app-empty-state titulo="Nenhum anunciante encontrado" texto="Tente outro nome, outra cidade ou limpe os filtros." icone="pi-building">
                            <button type="button" class="botao-contorno" (click)="limpar()">Limpar filtros</button>
                        </app-empty-state>
                    } @else {
                        <ul class="list-none m-0 p-0 flex flex-col gap-2">
                            @for (a of lista(); track a.id) {
                                <li class="anunciante-item" [class.selecionado]="a.id === selecionado()" [attr.id]="'anunciante-' + a.id">
                                    <button type="button" class="anunciante-item__selecionar" (click)="selecionar(a.id)" [attr.aria-pressed]="a.id === selecionado()" [attr.aria-label]="'Mostrar ' + a.nome + ' no mapa'">
                                        <app-anunciante-foto [nome]="a.nome" [foto]="a.fotoUrl" [grande]="true" />
                                        <span class="anunciante-item__texto">
                                            <span class="anunciante-item__nome">{{ a.nome }}</span>
                                            <span class="anunciante-item__linha">
                                                <span class="pilula">{{ a.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor(a)' }}</span>
                                                @if (a.creci) {
                                                    <span>CRECI {{ a.creci }}{{ a.creciUf ? '-' + a.creciUf : '' }}</span>
                                                }
                                            </span>
                                            <span class="anunciante-item__linha"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ local(a) }}</span>
                                        </span>
                                        <span class="anunciante-item__total" aria-hidden="true">
                                            <strong>{{ a.totalAnuncios }}</strong>
                                            <span>{{ a.totalAnuncios === 1 ? 'imóvel' : 'imóveis' }}</span>
                                        </span>
                                    </button>
                                    <a [routerLink]="['/anunciante', a.id, slug(a.nome)]" class="anunciante-item__perfil">
                                        Ver perfil e {{ a.totalAnuncios }} {{ a.totalAnuncios === 1 ? 'imóvel' : 'imóveis' }}<span class="sr-only"> de {{ a.nome }}</span> <i class="pi pi-arrow-right" aria-hidden="true"></i>
                                    </a>
                                </li>
                            }
                        </ul>
                    }
                </section>
                <div class="diretorio__mapa">
                    <app-mapa-osm [pontos]="pontos()" [ajustarAosPontos]="false" [centro]="centro()" [zoom]="zoom()" [selecionado]="selecionado()" (pontoClicado)="selecionar($event, true)" zoomRoda="livre" altura="100%" />
                </div>
            </div>
        </div>
    `,
    styles: `
        .diretorio__topo {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-end;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 0.75rem;
        }
        .diretorio__filtros {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
        }
        .diretorio__busca {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
        }
        .diretorio__busca p-autocomplete {
            flex: 1;
            min-width: 0;
        }
        .diretorio__local {
            flex: none;
            padding-left: 0.9rem;
            padding-right: 0.9rem;
        }
        .diretorio {
            display: grid;
            gap: 1rem;
            grid-template-columns: minmax(0, 1fr);
        }
        .diretorio__mapa {
            order: -1;
            height: 320px;
        }
        @media (min-width: 992px) {
            .diretorio {
                grid-template-columns: 26rem minmax(0, 1fr);
                height: min(72vh, 700px);
            }
            .diretorio__lista {
                overflow-y: auto;
                padding: 2px 0.25rem 2px 2px;
            }
            .diretorio__mapa {
                order: 0;
                height: 100%;
            }
        }
        /* o mapa ocupa a altura da coluna (o rodapé de atribuição fica embaixo) */
        .diretorio__mapa ::ng-deep app-mapa-osm {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .diretorio__mapa ::ng-deep .mapa-osm {
            flex: 1;
            min-height: 0;
        }
        .anunciante-item {
            border: 1px solid var(--site-borda);
            border-radius: var(--site-raio);
            background: var(--site-cartao);
            overflow: hidden;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .anunciante-item:hover {
            border-color: color-mix(in srgb, var(--p-primary-color), transparent 50%);
        }
        .anunciante-item.selecionado {
            border-color: var(--p-primary-color);
            box-shadow: 0 0 0 1px var(--p-primary-color), 0 4px 14px color-mix(in srgb, var(--p-primary-color), transparent 85%);
        }
        .anunciante-item__selecionar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.75rem;
            border: 0;
            background: transparent;
            color: inherit;
            font: inherit;
            text-align: left;
            cursor: pointer;
        }
        .anunciante-item__selecionar:focus-visible {
            outline: 2px solid var(--p-primary-color);
            outline-offset: -2px;
        }
        .anunciante-item__texto {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .anunciante-item__nome {
            font-weight: 700;
            color: var(--p-primary-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .anunciante-item__linha {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.8rem;
            color: var(--p-text-muted-color);
        }
        .anunciante-item__total {
            flex: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: 1.1;
            font-size: 0.7rem;
            color: var(--p-text-muted-color);
        }
        .anunciante-item__total strong {
            font-size: 1.15rem;
            color: var(--p-text-color);
        }
        .anunciante-item__perfil {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.4rem;
            padding: 0.45rem 0.75rem;
            border-top: 1px solid var(--site-borda);
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--p-primary-color);
            text-decoration: none;
        }
        .anunciante-item__perfil:hover {
            background: color-mix(in srgb, var(--p-primary-color), transparent 94%);
        }
        .anunciante-item.selecionado .anunciante-item__perfil {
            background: var(--p-primary-color);
            color: var(--p-primary-contrast-color);
        }
        @media (prefers-reduced-motion: reduce) {
            .anunciante-item {
                transition: none;
            }
        }
    `
})
export class AnunciantesPage {
    private anunciantes = inject(AnuncianteService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private el = inject(ElementRef<HTMLElement>);
    readonly tipos = TIPOS_ANUNCIANTE;
    readonly slug = slug;

    /** Todos os perfis públicos (os filtros são aplicados aqui, enquanto a pessoa digita). */
    private todos = signal<AnuncianteResumo[]>([]);
    carregando = signal(true);
    tipo = signal<TipoAnunciante | null>(null);
    cidade = signal<string | null>(null);
    /** Texto digitado (string) ou a sugestão escolhida (objeto) no autocomplete. */
    busca = signal<string | AnuncianteResumo>('');
    sugestoes = signal<AnuncianteResumo[]>([]);
    selecionado = signal<number | null>(null);

    centro = signal<[number, number]>(TAGUATINGA_SUL);
    zoom = signal(ZOOM_AMPLO);
    localizando = signal(false);
    avisoLocal = signal<string | null>(null);

    cidades = computed(() => [...new Set(this.todos().map((a) => a.cidade).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)));

    private texto = computed(() => {
        const b = this.busca();
        return typeof b === 'string' ? normalizar(b) : '';
    });

    lista = computed(() => {
        const tipo = this.tipo();
        const cidade = normalizar(this.cidade());
        const q = this.texto();
        return this.todos().filter(
            (a) =>
                (!tipo || a.tipo === tipo) &&
                (!cidade || normalizar(a.cidade) === cidade) &&
                (!q || [a.nome, a.bairro, a.cidade, a.creci].some((c) => normalizar(c).includes(q)))
        );
    });

    pontos = computed<PontoMapa[]>(() =>
        this.lista()
            .filter((a) => a.latitude != null && a.longitude != null)
            .map((a) => ({
                id: a.id,
                lat: a.latitude!,
                lng: a.longitude!,
                titulo: a.nome,
                subtitulo: `${a.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor(a)'} · ${this.local(a)}`,
                preco: `${a.totalAnuncios} ${a.totalAnuncios === 1 ? 'imóvel' : 'imóveis'}`,
                link: `/anunciante/${a.id}/${slug(a.nome)}`,
                rotuloLink: 'Ver perfil'
            }))
    );

    constructor() {
        inject(ConfigService).definirTitulo('Imobiliárias e corretores');
        this.anunciantes.listar({}).subscribe({
            next: (l) => {
                this.todos.set(l);
                this.carregando.set(false);
            },
            error: () => this.carregando.set(false)
        });
        const sub = this.route.queryParams.subscribe((qp) => {
            this.tipo.set(qp['tipo'] === 'IMOBILIARIA' || qp['tipo'] === 'CORRETOR' ? qp['tipo'] : null);
            this.cidade.set(qp['cidade'] ?? null);
        });
        inject(DestroyRef).onDestroy(() => sub.unsubscribe());
        // pede a localização ao abrir: permitido → centraliza onde a pessoa está, sem aproximar demais
        this.usarMinhaLocalizacao(true);
    }

    local(a: AnuncianteResumo): string {
        return [a.bairro, a.cidade && a.uf ? `${a.cidade}/${a.uf}` : a.cidade].filter(Boolean).join(', ') || 'Local não informado';
    }

    /** Seleciona (ou desmarca, clicando de novo) e leva o mapa até o anunciante. Do pino: rola a lista até o item. */
    selecionar(id: number, doMapa = false) {
        const novo = this.selecionado() === id && !doMapa ? null : id;
        this.selecionado.set(novo);
        if (novo != null && doMapa) {
            this.el.nativeElement.querySelector(`#anunciante-${novo}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    sugerir(e: AutoCompleteCompleteEvent) {
        const q = normalizar(e.query);
        // sugere entre todos (não só os filtrados): escolher um limpa os filtros que o esconderiam
        this.sugestoes.set(this.todos().filter((a) => !q || [a.nome, a.bairro, a.cidade, a.creci].some((c) => normalizar(c).includes(q))).slice(0, 8));
    }

    /** Escolheu uma sugestão: mostra todos de novo e seleciona aquele no mapa. */
    escolher(e: AutoCompleteSelectEvent) {
        const a = e.value as AnuncianteResumo;
        this.busca.set(a);
        // garante que o escolhido apareça mesmo com filtros de tipo/cidade diferentes
        if ((this.tipo() && this.tipo() !== a.tipo) || (this.cidade() && normalizar(this.cidade()) !== normalizar(a.cidade))) {
            this.router.navigate([], { queryParams: { tipo: null, cidade: null }, replaceUrl: true });
        }
        this.selecionar(a.id, true);
    }

    mudarBusca(v: string | AnuncianteResumo | null) {
        this.busca.set(v ?? '');
        if (typeof v === 'string' || v == null) this.selecionado.set(null);
    }

    mudarTipo(t: TipoAnunciante | null) {
        this.selecionado.set(null);
        this.router.navigate([], { queryParams: { tipo: t, cidade: this.cidade() }, replaceUrl: true });
    }

    /** Escolher uma cidade é uma seleção: o mapa vai até ela (centro dos anunciantes de lá), ainda amplo. */
    mudarCidade(c: string | null) {
        this.selecionado.set(null);
        this.router.navigate([], { queryParams: { tipo: this.tipo(), cidade: c }, replaceUrl: true });
        const pts = c ? this.todos().filter((a) => normalizar(a.cidade) === normalizar(c) && a.latitude != null && a.longitude != null) : [];
        if (pts.length) {
            this.centro.set([pts.reduce((s, a) => s + a.latitude!, 0) / pts.length, pts.reduce((s, a) => s + a.longitude!, 0) / pts.length]);
            this.zoom.set(ZOOM_AMPLO);
        }
    }

    limpar() {
        this.busca.set('');
        this.selecionado.set(null);
        this.router.navigate([], { queryParams: {} });
    }

    /** Centraliza o mapa na localização da pessoa (o navegador pede a permissão). Sem permissão: Taguatinga Sul. */
    usarMinhaLocalizacao(automatico = false) {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            if (!automatico) this.avisoLocal.set('Seu navegador não informa a localização. Mostrando Taguatinga Sul.');
            return;
        }
        this.localizando.set(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.localizando.set(false);
                this.avisoLocal.set(null);
                this.selecionado.set(null);
                this.centro.set([+pos.coords.latitude.toFixed(5), +pos.coords.longitude.toFixed(5)]);
                this.zoom.set(ZOOM_AMPLO);
            },
            () => {
                this.localizando.set(false);
                this.centro.set([...TAGUATINGA_SUL]);
                this.zoom.set(ZOOM_AMPLO);
                this.avisoLocal.set('Sem acesso à sua localização: mostrando Taguatinga Sul. Use "Perto de mim" para tentar de novo.');
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    }
}
