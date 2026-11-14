import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { DrawerModule } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import { ContagemTipo, Finalidade, ImovelFiltro, ImovelResumo, PageResponse, TipoImovel, finalidadeLabel, tipoLabel } from '@/app/core/models/models';
import { ImovelService } from '@/app/core/services/imovel.service';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { FiltrosBusca } from '@/app/shared/components/filtros-busca';
import { TiposContagem } from '@/app/shared/components/tipos-contagem';
import { ImovelCard } from '@/app/shared/components/imovel-card';
import { ContatoForm } from '@/app/shared/components/contato-form';
import { EmptyState } from '@/app/shared/components/empty-state';

const ORDENS = [
    { value: 'relevancia', label: 'Relevância' },
    { value: 'recentes', label: 'Mais recentes' },
    { value: 'menor-preco', label: 'Menor preço' },
    { value: 'maior-preco', label: 'Maior preço' },
    { value: 'maior-area', label: 'Maior área' },
    { value: 'mais-vistos', label: 'Mais vistos' }
];

/** Resultados da busca: filtros à esquerda, lista de cartões no centro e chamada para anunciantes à direita. */
@Component({
    selector: 'app-busca-page',
    imports: [RouterLink, ReactiveFormsModule, SelectModule, ButtonModule, PaginatorModule, DialogModule, SkeletonModule, DrawerModule, FiltrosBusca, TiposContagem, ImovelCard, ContatoForm, EmptyState],
    template: `
        <div class="site-container busca">
            <aside class="busca__lateral" aria-label="Filtros">
                <div class="painel-lateral"><app-filtros-busca [valor]="filtro()" (buscar)="aplicar($event)" /></div>
                <app-tipos-contagem [tipos]="contagem()" (aplicar)="filtrarTipo($event)" />
            </aside>

            <section class="busca__resultados" aria-labelledby="busca-titulo">
                <div class="busca__topo">
                    <div>
                        <h1 id="busca-titulo" class="busca__titulo">{{ titulo() }}</h1>
                        <div class="flex flex-wrap gap-2 mt-2">
                            <a routerLink="/mapa" [queryParams]="paramsAtuais()" class="botao-contorno botao-contorno--grande"><i class="pi pi-map-marker" aria-hidden="true"></i> Ver no mapa</a>
                            <button type="button" class="botao-contorno botao-contorno--grande lg:hidden" (click)="filtrosAbertos.set(true)"><i class="pi pi-filter" aria-hidden="true"></i> Filtros</button>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <label for="ordem" class="sr-only">Ordenar</label>
                        <p-select inputId="ordem" [options]="ordens" optionLabel="label" optionValue="value" [formControl]="ordem" placeholder="Ordenar" styleClass="min-w-44" (onChange)="ordenar()" />
                        <a routerLink="/anunciar" class="botao-contorno botao-contorno--verde botao-contorno--grande"><i class="pi pi-home" aria-hidden="true"></i> Anunciar imóvel</a>
                    </div>
                </div>

                @if (carregando()) {
                    @for (i of [1, 2, 3]; track i) {
                        <div class="imovel-card"><p-skeleton width="100%" height="200px" /></div>
                    }
                } @else if (pagina().content.length === 0) {
                    <app-empty-state titulo="Nenhum imóvel encontrado" texto="Tente remover alguns filtros ou buscar em outra região." icone="pi-search">
                        <p-button label="Limpar filtros" [outlined]="true" (onClick)="limpar()" />
                    </app-empty-state>
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (i of pagina().content; track i.id) {
                            <app-imovel-card [imovel]="i" [favorito]="conta.favoritos().has(i.id)" (favoritar)="favoritar($event)" (contatar)="contatando.set($event)" />
                        }
                    </div>
                    @if (pagina().totalPages > 1) {
                        <p-paginator [first]="pagina().page * pagina().size" [rows]="pagina().size" [totalRecords]="pagina().totalElements" (onPageChange)="mudarPagina($event)" styleClass="mt-4 bg-transparent" />
                    }
                }

                <section class="busca__atalhos" aria-label="Atalhos de busca">
                    <div>
                        <h2>Buscar por quartos</h2>
                        @for (q of [1, 2, 3, 4]; track q) {
                            <a [routerLink]="[]" [queryParams]="{ quartos: q, page: null }" queryParamsHandling="merge">{{ q }}+ quarto{{ q > 1 ? 's' : '' }}</a>
                        }
                    </div>
                    <div>
                        <h2>Buscar por tipo</h2>
                        @for (t of tiposAtalho; track t.value) {
                            <a [routerLink]="[]" [queryParams]="{ tipo: t.value, page: null }" queryParamsHandling="merge">{{ t.label }}</a>
                        }
                    </div>
                    <div>
                        <h2>Buscar por vagas</h2>
                        @for (v of [1, 2, 3]; track v) {
                            <a [routerLink]="[]" [queryParams]="{ vagas: v, page: null }" queryParamsHandling="merge">{{ v }}+ vaga{{ v > 1 ? 's' : '' }}</a>
                        }
                    </div>
                </section>
            </section>

            <aside class="busca__promo" aria-label="Anuncie">
                <div class="promo">
                    <div class="promo__titulo">Segurança<br />Praticidade<br />Tecnologia</div>
                    <p>Anuncie seus imóveis e receba contatos direto no seu painel.</p>
                    <a routerLink="/anunciar" class="promo__botao">Quero anunciar</a>
                </div>
            </aside>
        </div>

        <p-drawer [visible]="filtrosAbertos()" (visibleChange)="filtrosAbertos.set($event)" header="Filtros" position="left" styleClass="w-[22rem] max-w-full">
            <app-filtros-busca [valor]="filtro()" (buscar)="aplicar($event); filtrosAbertos.set(false)" />
        </p-drawer>

        <p-dialog [visible]="!!contatando()" (visibleChange)="!$event && contatando.set(null)" [modal]="true" [header]="'Contatar sobre: ' + (contatando()?.titulo ?? '')" [style]="{ width: '30rem' }" [breakpoints]="{ '575px': '95vw' }" [dismissableMask]="true">
            @if (contatando(); as c) {
                <app-contato-form [imovelId]="c.id" />
            }
        </p-dialog>
    `
})
export class BuscaPage {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private imoveis = inject(ImovelService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);
    private config = inject(ConfigService);
    conta = inject(ContaService);

    ordens = ORDENS;
    tiposAtalho = [
        { value: 'APARTAMENTO', label: 'Apartamento' },
        { value: 'CASA', label: 'Casa' },
        { value: 'CASA_CONDOMINIO', label: 'Casa em condomínio' },
        { value: 'LOTE', label: 'Lote / Terreno' },
        { value: 'SALA', label: 'Sala comercial' }
    ];
    ordem = new FormControl<string | null>(null);

    carregando = signal(true);
    pagina = signal<PageResponse<ImovelResumo>>({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    contagem = signal<ContagemTipo[]>([]);
    contatando = signal<ImovelResumo | null>(null);
    filtrosAbertos = signal(false);

    private entrada = toSignal(combineLatest([this.route.data, this.route.queryParams]));

    filtro = computed<ImovelFiltro>(() => {
        const [data, qp] = this.entrada() ?? [{}, {}];
        return this.paraFiltro(data, qp);
    });

    paramsAtuais = computed(() => this.route.snapshot.queryParams);

    titulo = computed(() => {
        const f = this.filtro();
        const total = this.pagina().totalElements;
        const tipo = f.tipo?.length === 1 ? tipoLabel(f.tipo[0]) + 's' : 'Imóveis';
        const fin = f.lancamento ? 'novos (lançamentos)' : f.finalidade === 'ALUGUEL' ? 'para alugar' : f.finalidade === 'TEMPORADA' ? 'para temporada' : 'à venda';
        const onde = f.bairro ? ` em ${f.bairro}` : f.cidade ? ` em ${f.cidade}` : f.uf ? ` no ${f.uf}` : '';
        return `${total.toLocaleString('pt-BR')} ${tipo} ${fin}${onde}`;
    });

    constructor() {
        combineLatest([this.route.data, this.route.queryParams]).subscribe(([data, qp]) => {
            const f = this.paraFiltro(data, qp);
            this.ordem.setValue(f.ordem ?? null, { emitEvent: false });
            this.config.definirTitulo(`Imóveis ${finalidadeLabel(f.finalidade).toLowerCase()}`);
            this.carregar(f);
        });
    }

    private paraFiltro(data: Params, qp: Params): ImovelFiltro {
        const num = (k: string) => (qp[k] != null && qp[k] !== '' ? Number(qp[k]) : null);
        const tipo = qp['tipo'];
        return {
            finalidade: (qp['finalidade'] as Finalidade) ?? (data['finalidade'] as Finalidade) ?? 'VENDA',
            lancamento: data['lancamento'] || qp['lancamento'] === 'true' ? true : null,
            tipo: tipo ? ((Array.isArray(tipo) ? tipo : [tipo]) as TipoImovel[]) : null,
            uf: qp['uf'] ?? null,
            cidade: qp['cidade'] ?? null,
            bairro: qp['bairro'] ?? null,
            quartos: num('quartos'),
            vagas: num('vagas'),
            precoMin: num('precoMin'),
            precoMax: num('precoMax'),
            q: qp['q'] ?? null,
            ordem: qp['ordem'] ?? null,
            page: num('page') ?? 0,
            size: 12
        };
    }

    private carregar(f: ImovelFiltro) {
        this.carregando.set(true);
        this.imoveis.buscar(f).subscribe({
            next: (p) => {
                this.pagina.set(p);
                this.carregando.set(false);
            },
            error: (e) => {
                this.carregando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro na busca', detail: mensagemErro(e) });
            }
        });
        this.imoveis.contagemTipos({ ...f, tipo: null, page: null }).subscribe({ next: (c) => this.contagem.set(c), error: () => this.contagem.set([]) });
    }

    /** Leva o filtro para a URL (dá para compartilhar o link da busca). */
    aplicar(f: ImovelFiltro) {
        const rota = f.lancamento ? '/imovel-novo' : f.finalidade === 'ALUGUEL' ? '/aluguel' : f.finalidade === 'TEMPORADA' ? '/temporada' : '/venda';
        this.router.navigate([rota], {
            queryParams: {
                tipo: f.tipo ?? null,
                uf: f.uf || null,
                cidade: f.cidade || null,
                bairro: f.bairro || null,
                quartos: f.quartos || null,
                precoMax: f.precoMax || null,
                q: f.q || null,
                ordem: this.ordem.value || null
            }
        });
    }

    filtrarTipo(tipo: TipoImovel | null) {
        this.router.navigate([], { relativeTo: this.route, queryParams: { tipo, page: null }, queryParamsHandling: 'merge' });
    }

    ordenar() {
        this.router.navigate([], { relativeTo: this.route, queryParams: { ordem: this.ordem.value, page: null }, queryParamsHandling: 'merge' });
    }

    mudarPagina(e: PaginatorState) {
        this.router.navigate([], { relativeTo: this.route, queryParams: { page: e.page || null }, queryParamsHandling: 'merge' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    limpar() {
        this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }

    favoritar(i: ImovelResumo) {
        if (!this.auth.logado()) {
            this.msg.add({ severity: 'info', summary: 'Entre para salvar favoritos', detail: 'Faça login ou crie sua conta grátis.' });
            this.router.navigate(['/conta/login'], { queryParams: { voltar: this.router.url } });
            return;
        }
        this.conta.alternarFavorito(i.id).subscribe({ error: (e) => this.msg.add({ severity: 'error', summary: 'Favoritos', detail: mensagemErro(e) }) });
    }
}
