import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { CONDICOES, ImovelDetalhe, ImovelResumo, finalidadeLabel, tituloAnuncio } from '@/app/core/models/models';
import { ContaService } from '@/app/core/services/conta.service';
import { ConfigService } from '@/app/core/services/config.service';
import { slug } from '@/app/core/pipes/formatos';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ImovelFoto } from '@/app/shared/components/imovel-foto';
import { MapaOsm, PontoMapa } from '@/app/shared/components/mapa-osm';
import { SimulacaoDialog } from '@/app/shared/components/financiamento/simulacao-dialog';
import { motivoInelegivel, parcelaEstimada } from '@/app/shared/components/financiamento/simulacao';

const MAX = 4;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type Tipo = 'moeda' | 'numero' | 'texto' | 'sim-nao';

/** Uma linha da tabela: como obter o valor e, quando numérica, qual é o melhor (menor ou maior). */
interface Linha {
    id: string;
    rotulo: string;
    dica?: string;
    tipo: Tipo;
    valor: (i: ImovelDetalhe) => number | string | boolean | null;
    melhor?: 'menor' | 'maior';
    sufixo?: string;
}

interface Grupo {
    id: string;
    titulo: string;
    icone: string;
    linhas: Linha[];
}

/** Destaques do resumo: a linha que define e o texto do selo. */
const SELOS: { linha: string; texto: string; icone: string }[] = [
    { linha: 'preco', texto: 'Mais barato', icone: 'pi-tag' },
    { linha: 'precoM2', texto: 'Melhor preço do m²', icone: 'pi-chart-bar' },
    { linha: 'areaUtil', texto: 'Mais espaçoso', icone: 'pi-arrows-alt' },
    { linha: 'custoMensal', texto: 'Menor custo mensal', icone: 'pi-wallet' }
];

/**
 * Comparação de 2 a 4 favoritos lado a lado. A seleção fica na URL (?ids=1,2,3), então dá para voltar,
 * recarregar e compartilhar o link com quem também tem os imóveis nos favoritos.
 */
@Component({
    selector: 'app-comparar-page',
    imports: [CurrencyPipe, FormsModule, RouterLink, ButtonModule, MultiSelectModule, ToggleSwitchModule, TagModule, TooltipModule, PageHeader, EmptyState, ImovelFoto, MapaOsm, SimulacaoDialog],
    template: `
        <app-page-header titulo="Comparar favoritos" subtitulo="Coloque até 4 imóveis lado a lado e veja qual vale mais a pena.">
            <p-button label="Copiar link" icon="pi pi-link" severity="secondary" [outlined]="true" (onClick)="copiarLink()" [disabled]="ids().length < 2" styleClass="print:hidden" />
            <p-button label="Imprimir" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="imprimir()" [disabled]="detalhes().length < 2" styleClass="print:hidden" />
        </app-page-header>

        @if (!carregandoFavoritos() && favoritos().length < 2) {
            <div class="card">
                <app-empty-state titulo="Favorite pelo menos 2 imóveis" texto="A comparação usa os imóveis salvos nos seus favoritos. Toque no coração dos anúncios que te interessam." icone="pi-clone">
                    <a routerLink="/venda" class="p-button">Buscar imóveis</a>
                </app-empty-state>
            </div>
        } @else {
            <div class="card print:hidden">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] items-end">
                    <div class="flex flex-col gap-2">
                        <label for="comparar-sel" class="font-medium">Imóveis na comparação ({{ ids().length }}/{{ max }})</label>
                        <p-multiselect
                            inputId="comparar-sel"
                            [options]="favoritos()"
                            optionLabel="titulo"
                            optionValue="id"
                            [ngModel]="ids()"
                            (ngModelChange)="selecionar($event)"
                            [selectionLimit]="max"
                            [maxSelectedLabels]="max"
                            display="chip"
                            placeholder="Escolha de 2 a 4 favoritos"
                            [showToggleAll]="false"
                            [filter]="true"
                            filterPlaceHolder="Buscar nos favoritos"
                            [fluid]="true"
                            [loading]="carregandoFavoritos()"
                        >
                            <ng-template #item let-f>
                                <div class="flex flex-col">
                                    <span>{{ f.titulo }}</span>
                                    <small class="text-muted-color">{{ f.bairro }}, {{ f.cidade }} · {{ f.preco | currency: 'BRL' }}</small>
                                </div>
                            </ng-template>
                        </p-multiselect>
                    </div>
                    <div class="flex flex-wrap gap-x-6 gap-y-3">
                        <div class="flex items-center gap-2">
                            <p-toggleswitch inputId="comparar-dif" [ngModel]="soDiferencas()" (ngModelChange)="soDiferencas.set($event)" />
                            <label for="comparar-dif" class="cursor-pointer">Só o que muda</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <p-toggleswitch inputId="comparar-dest" [ngModel]="destacar()" (ngModelChange)="destacar.set($event)" />
                            <label for="comparar-dest" class="cursor-pointer">Destacar o melhor</label>
                        </div>
                    </div>
                </div>
                @if (ids().length < 2) {
                    <div class="flex flex-wrap items-center gap-3 mt-4">
                        <span class="text-muted-color">Escolha pelo menos 2 imóveis.</span>
                        <p-button label="Comparar os mais recentes" icon="pi pi-bolt" size="small" [text]="true" (onClick)="selecionar(sugestao())" />
                    </div>
                }
            </div>

            @if (detalhes().length >= 2) {
                @let lista = detalhes();
                <!-- cabeçalho: um cartão por imóvel. Celular: carrossel lateral (com o próximo aparecendo); do sm em diante, grid -->
                <div
                    [class]="'flex gap-3 mt-6 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:gap-4 sm:overflow-visible sm:pb-0 sm:grid-cols-2 ' + (lista.length === 4 ? 'xl:grid-cols-4' : lista.length === 3 ? 'lg:grid-cols-3' : '')"
                    role="list"
                    aria-label="Imóveis comparados"
                >
                    @for (i of lista; track i.id) {
                        <article class="card m-0 p-0! overflow-hidden flex flex-col w-[80%] shrink-0 snap-start sm:w-auto" role="listitem" [attr.aria-label]="i.titulo">
                            <div class="relative aspect-[16/10] sm:aspect-[4/3]">
                                <app-imovel-foto class="w-full h-full" [src]="i.fotos[0]?.url ?? null" [tipo]="i.tipo" [semente]="i.id" [alt]="i.titulo" [mostrarTexto]="false" />
                                <p-button icon="pi pi-times" [rounded]="true" severity="secondary" size="small" class="absolute top-2 right-2 print:hidden" (onClick)="remover(i.id)" [ariaLabel]="'Tirar ' + i.titulo + ' da comparação'" pTooltip="Tirar da comparação" />
                                @if (vencedor() === i.id) {
                                    <p-tag class="absolute top-2 left-2" severity="success" value="Destaque geral" icon="pi pi-star-fill" />
                                }
                            </div>
                            <div class="p-3 flex flex-col gap-2 grow">
                                <a [routerLink]="['/imovel', i.id, slugTexto(i.titulo)]" class="font-semibold text-primary hover:underline line-clamp-2">{{ i.titulo }}</a>
                                <!-- o código liga o cartão às colunas das tabelas abaixo -->
                                <span class="text-sm text-muted-color">{{ i.codigo }} · {{ i.bairro }}, {{ i.cidade }}/{{ i.uf }}</span>
                                <span class="text-xl font-semibold">{{ i.preco | currency: 'BRL' }}</span>
                                <div class="flex flex-wrap gap-1">
                                    @for (s of selosDe(i.id); track s.texto) {
                                        <p-tag severity="info" [value]="s.texto" [icon]="'pi ' + s.icone" />
                                    }
                                </div>
                                <div class="text-sm text-muted-color mt-auto">Vence em {{ vitorias().get(i.id) ?? 0 }} de {{ linhasComparaveis() }} itens</div>
                                @if (simulacaoLigada() && i.financeiras.length) {
                                    <p-button label="Simular financiamento" icon="pi pi-calculator" size="small" [outlined]="true" styleClass="w-full print:hidden" (onClick)="simulando.set(i)" />
                                }
                            </div>
                        </article>
                    }
                </div>

                <!-- tabela comparativa -->
                <!--
                    Celular: a coluna de rótulos some (fica só para leitor de tela) e cada rótulo vira uma linha própria
                    acima dos valores, que ocupam a largura toda em colunas iguais — sem rolagem lateral.
                    Do sm em diante: tabela clássica, com rótulos fixos à esquerda e largura mínima por coluna.
                -->
                <div class="card mt-6 overflow-x-auto">
                    <table class="w-full text-sm border-collapse table-fixed sm:table-auto sm:min-w-(--largura-min)" [style.--largura-min]="lista.length * 12 + 12 + 'rem'">
                        <caption class="sr-only">Comparação detalhada dos imóveis selecionados</caption>
                        <thead>
                            <tr>
                                <th scope="col" class="sr-only sm:not-sr-only text-left sm:p-2 sm:w-48 sm:sticky left-0 bg-surface-0 dark:bg-surface-900 z-10"><span class="sr-only">Item</span></th>
                                @for (i of lista; track i.id) {
                                    <th scope="col" class="text-left p-2 font-semibold break-words">{{ i.codigo }}</th>
                                }
                            </tr>
                        </thead>
                        @for (g of gruposVisiveis(); track g.id) {
                            <tbody>
                                <tr>
                                    <th [attr.colspan]="lista.length + 1" scope="colgroup" class="text-left pt-5 pb-2 px-2 text-base font-semibold sticky left-0">
                                        <i class="pi {{ g.icone }} text-primary mr-2" aria-hidden="true"></i>{{ g.titulo }}
                                    </th>
                                </tr>
                                @for (l of g.linhas; track l.id) {
                                    <tr class="sm:hidden border-t border-surface" aria-hidden="true">
                                        <td [attr.colspan]="lista.length" class="px-2 pt-2 pb-0 text-xs font-medium text-muted-color">{{ l.rotulo }}</td>
                                    </tr>
                                    <tr class="sm:border-t border-surface">
                                        <th scope="row" class="sr-only sm:not-sr-only text-left sm:p-2 font-medium text-muted-color sm:sticky left-0 bg-surface-0 dark:bg-surface-900 z-10">
                                            {{ l.rotulo }}
                                            @if (l.dica) {
                                                <i class="pi pi-info-circle text-xs ml-1" [pTooltip]="l.dica" tabindex="0" [attr.aria-label]="l.dica"></i>
                                            }
                                        </th>
                                        @for (i of lista; track i.id) {
                                            @let melhor = destacar() && ehMelhor(l, i);
                                            <td class="p-2 break-words" [class]="melhor ? 'font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-400/10' : ''">
                                                @switch (l.tipo) {
                                                    @case ('sim-nao') {
                                                        @if (l.valor(i)) {
                                                            <i class="pi pi-check-circle text-green-600 dark:text-green-400" aria-hidden="true"></i> <span>Sim</span>
                                                        } @else {
                                                            <i class="pi pi-minus-circle text-muted-color" aria-hidden="true"></i> <span class="text-muted-color">Não</span>
                                                        }
                                                    }
                                                    @default {
                                                        {{ formatar(l, i) }}
                                                    }
                                                }
                                                @if (melhor) {
                                                    <span class="sr-only">(melhor)</span>
                                                }
                                            </td>
                                        }
                                    </tr>
                                }
                            </tbody>
                        }
                    </table>
                    @if (gruposVisiveis().length === 0) {
                        <p class="text-muted-color m-0 p-2">Os imóveis são iguais em todos os itens. Desligue "Só o que muda" para ver tudo.</p>
                    }
                    <p class="text-xs text-muted-color mt-3 mb-0">
                        Em verde, o melhor valor de cada item entre os selecionados.
                        @if (simulacaoLigada()) {
                            A parcela estimada usa a financeira de menor parcela, com a entrada mínima e o prazo máximo dela.
                        }
                    </p>
                </div>

                <!-- características: matriz -->
                @if (caracteristicas().length) {
                    <div class="card mt-6 overflow-x-auto">
                        <h2 class="text-lg font-semibold mt-0">Itens do imóvel</h2>
                        <table class="w-full text-sm border-collapse table-fixed sm:table-auto sm:min-w-(--largura-min)" [style.--largura-min]="lista.length * 10 + 12 + 'rem'">
                            <caption class="sr-only">Itens de cada imóvel</caption>
                            <thead>
                                <tr>
                                    <th scope="col" class="sr-only sm:not-sr-only text-left sm:p-2 sm:w-48"><span class="sr-only">Item</span></th>
                                    @for (i of lista; track i.id) {
                                        <th scope="col" class="text-left p-2 break-words">{{ i.codigo }} <span class="font-normal text-muted-color">({{ i.caracteristicas.length }})</span></th>
                                    }
                                </tr>
                            </thead>
                            <tbody>
                                @for (c of caracteristicas(); track c) {
                                    <tr class="sm:hidden border-t border-surface" aria-hidden="true">
                                        <td [attr.colspan]="lista.length" class="px-2 pt-2 pb-0 text-xs font-medium text-muted-color">{{ c }}</td>
                                    </tr>
                                    <tr class="sm:border-t border-surface">
                                        <th scope="row" class="sr-only sm:not-sr-only text-left sm:p-2 font-normal">{{ c }}</th>
                                        @for (i of lista; track i.id) {
                                            <td class="p-2">
                                                @if (i.caracteristicas.includes(c)) {
                                                    <i class="pi pi-check text-green-600 dark:text-green-400" aria-label="Tem"></i>
                                                } @else {
                                                    <span class="text-muted-color" aria-label="Não tem">—</span>
                                                }
                                            </td>
                                        }
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                <!-- mapa -->
                <div class="card mt-6 print:hidden">
                    <h2 class="text-lg font-semibold mt-0">Onde ficam</h2>
                    @if (pontos().length) {
                        <app-mapa-osm [pontos]="pontos()" altura="380px" [cliqueParaCarregar]="true" />
                        @if (pontos().length < lista.length) {
                            <p class="text-sm text-muted-color mb-0 mt-2">{{ lista.length - pontos().length }} imóvel(is) sem posição informada pelo anunciante.</p>
                        }
                    } @else {
                        <p class="text-muted-color m-0">Os anunciantes não informaram a posição destes imóveis no mapa.</p>
                    }
                </div>
            } @else if (carregandoDetalhes()) {
                <div class="card mt-6 text-muted-color"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i> Carregando a comparação…</div>
            }
        }

        @if (simulando(); as s) {
            <app-simulacao-dialog [visivel]="!!simulando()" (visivelChange)="!$event && simulando.set(null)" [titulo]="s.titulo" [preco]="s.preco" [financeiras]="s.financeiras" />
        }
    `
})
export class CompararPage {
    private conta = inject(ContaService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private msg = inject(MessageService);
    private config = inject(ConfigService).config;

    readonly max = MAX;
    favoritos = signal<ImovelResumo[]>([]);
    carregandoFavoritos = signal(true);
    carregandoDetalhes = signal(false);
    soDiferencas = signal(false);
    destacar = signal(true);
    simulando = signal<ImovelDetalhe | null>(null);
    simulacaoLigada = computed(() => this.config().simulacaoFinanciamento !== false);

    /** Seleção vinda da URL (?ids=1,2,3). */
    private query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
    ids = computed(() =>
        [...new Set((this.query().get('ids') ?? '').split(',').map(Number))]
            .filter((n) => Number.isInteger(n) && n > 0)
            .slice(0, MAX)
    );

    detalhes = toSignal(
        toObservable(this.ids).pipe(
            debounceTime(150),
            switchMap((ids) => {
                if (ids.length < 2) return of([] as ImovelDetalhe[]);
                this.carregandoDetalhes.set(true);
                return this.conta.compararFavoritos(ids).pipe(catchError(() => of([] as ImovelDetalhe[])));
            })
        ),
        { initialValue: [] as ImovelDetalhe[] }
    );

    sugestao = computed(() => this.favoritos().slice(0, 2).map((f) => f.id));

    /** Menor parcela estimada entre as financeiras do anúncio em que o preço se enquadra. */
    private parcela = (i: ImovelDetalhe): number | null => {
        if (!this.simulacaoLigada()) return null;
        const valores = i.financeiras.filter((f) => !motivoInelegivel(f, i.preco)).map((f) => parcelaEstimada(f, i.preco));
        return valores.length ? Math.min(...valores) : null;
    };
    private custoMensal = (i: ImovelDetalhe): number | null => {
        const partes = [i.condominio, i.iptu != null ? i.iptu / 12 : null, this.parcela(i)].filter((v): v is number => v != null && v > 0);
        return partes.length ? partes.reduce((a, b) => a + b, 0) : null;
    };

    grupos = computed<Grupo[]>(() => [
        {
            id: 'valores',
            titulo: 'Valores',
            icone: 'pi-dollar',
            linhas: [
                { id: 'finalidade', rotulo: 'Finalidade', tipo: 'texto', valor: (i) => finalidadeLabel(i.finalidade) },
                { id: 'preco', rotulo: 'Preço', tipo: 'moeda', valor: (i) => i.preco, melhor: 'menor' },
                { id: 'precoM2', rotulo: 'Preço do m²', tipo: 'moeda', valor: (i) => (i.areaUtil ? i.preco / i.areaUtil : null), melhor: 'menor', dica: 'Preço dividido pela área útil.' }
            ]
        },
        {
            id: 'mensal',
            titulo: 'Custo por mês',
            icone: 'pi-wallet',
            linhas: [
                { id: 'condominio', rotulo: 'Condomínio', tipo: 'moeda', valor: (i) => i.condominio, melhor: 'menor' },
                { id: 'iptu', rotulo: 'IPTU (por mês)', tipo: 'moeda', valor: (i) => (i.iptu != null ? i.iptu / 12 : null), melhor: 'menor', dica: 'IPTU anual dividido por 12.' },
                ...(this.simulacaoLigada()
                    ? [{ id: 'parcela', rotulo: 'Parcela estimada', tipo: 'moeda' as Tipo, valor: this.parcela, melhor: 'menor' as const, dica: 'Menor 1ª parcela entre as financeiras do anúncio, com entrada mínima e prazo máximo.' }]
                    : []),
                { id: 'custoMensal', rotulo: 'Total estimado', tipo: 'moeda', valor: this.custoMensal, melhor: 'menor', dica: 'Soma do que foi informado: condomínio, IPTU mensal e parcela estimada.' }
            ]
        },
        {
            id: 'espaco',
            titulo: 'Espaço',
            icone: 'pi-arrows-alt',
            linhas: [
                { id: 'tipo', rotulo: 'Tipo', tipo: 'texto', valor: (i) => i.tipoDescricao },
                { id: 'areaUtil', rotulo: 'Área útil', tipo: 'numero', valor: (i) => i.areaUtil, melhor: 'maior', sufixo: ' m²' },
                { id: 'areaTotal', rotulo: 'Área total', tipo: 'numero', valor: (i) => i.areaTotal, melhor: 'maior', sufixo: ' m²' },
                { id: 'quartos', rotulo: 'Quartos', tipo: 'numero', valor: (i) => i.quartos, melhor: 'maior' },
                { id: 'suites', rotulo: 'Suítes', tipo: 'numero', valor: (i) => i.suites, melhor: 'maior' },
                { id: 'banheiros', rotulo: 'Banheiros', tipo: 'numero', valor: (i) => i.banheiros, melhor: 'maior' },
                { id: 'vagas', rotulo: 'Vagas', tipo: 'numero', valor: (i) => i.vagas, melhor: 'maior' },
                { id: 'itens', rotulo: 'Itens do imóvel', tipo: 'numero', valor: (i) => i.caracteristicas.length, melhor: 'maior', dica: 'Quantidade de itens informados (veja a lista abaixo).' }
            ]
        },
        {
            id: 'condicoes',
            titulo: 'Condições e documentação',
            icone: 'pi-file-check',
            linhas: this.linhasCondicoes()
        },
        {
            id: 'anuncio',
            titulo: 'Anúncio',
            icone: 'pi-megaphone',
            linhas: [
                { id: 'endereco', rotulo: 'Endereço', tipo: 'texto', valor: (i) => tituloAnuncio(i) || `${i.bairro}, ${i.cidade}` },
                { id: 'anunciante', rotulo: 'Anunciante', tipo: 'texto', valor: (i) => i.anunciante?.nome ?? null },
                { id: 'fotos', rotulo: 'Fotos', tipo: 'numero', valor: (i) => i.fotos.length, melhor: 'maior' },
                { id: 'publicado', rotulo: 'Publicado em', tipo: 'texto', valor: (i) => new Date(i.criadoEm).toLocaleDateString('pt-BR') }
            ]
        }
    ]);

    /**
     * Condições conforme as finalidades dos imóveis escolhidos: itens de venda só se houver venda,
     * garantias/inclusos do aluguel só se houver aluguel, e assim por diante.
     */
    private linhasCondicoes(): Linha[] {
        const finalidades = new Set(this.detalhes().map((i) => i.finalidade));
        const linhas: Linha[] = [];
        if (finalidades.has('VENDA')) {
            linhas.push(
                { id: 'financiamento', rotulo: 'Aceita financiamento', tipo: 'sim-nao', valor: (i) => i.aceitaFinanciamento },
                { id: 'fgts', rotulo: 'Aceita FGTS', tipo: 'sim-nao', valor: (i) => i.aceitaFgts },
                { id: 'permuta', rotulo: 'Aceita permuta', tipo: 'sim-nao', valor: (i) => i.aceitaPermuta },
                { id: 'escritura', rotulo: 'Escritura registrada', tipo: 'sim-nao', valor: (i) => i.escrituraRegistrada },
                { id: 'quitado', rotulo: 'Imóvel quitado', tipo: 'sim-nao', valor: (i) => i.quitado }
            );
        }
        if (finalidades.has('ALUGUEL')) {
            linhas.push({ id: 'contrato', rotulo: 'Contrato mínimo', tipo: 'numero', valor: (i) => i.contratoMinimoMeses, melhor: 'menor', sufixo: ' meses' });
        }
        if (finalidades.has('TEMPORADA')) {
            linhas.push(
                { id: 'noites', rotulo: 'Mínimo de noites', tipo: 'numero', valor: (i) => i.noitesMinimas, melhor: 'menor' },
                { id: 'hospedes', rotulo: 'Hóspedes (máx.)', tipo: 'numero', valor: (i) => i.hospedesMaximo, melhor: 'maior' },
                { id: 'limpeza', rotulo: 'Taxa de limpeza', tipo: 'moeda', valor: (i) => i.taxaLimpeza, melhor: 'menor' },
                { id: 'checkin', rotulo: 'Check-in', tipo: 'texto', valor: (i) => i.horarioCheckin },
                { id: 'checkout', rotulo: 'Check-out', tipo: 'texto', valor: (i) => i.horarioCheckout }
            );
        }
        for (const f of finalidades) {
            for (const g of CONDICOES[f]) {
                for (const c of g.itens) {
                    linhas.push({ id: 'cond-' + c.codigo, rotulo: c.label, dica: c.dica, tipo: 'sim-nao', valor: (i) => i.finalidade === f && (i.condicoes ?? []).includes(c.codigo) });
                }
            }
        }
        linhas.push({ id: 'lancamento', rotulo: 'Imóvel novo / lançamento', tipo: 'sim-nao', valor: (i) => i.lancamento });
        return linhas;
    }

    /** Grupos/linhas exibidos (com "Só o que muda", esconde as linhas iguais em todos). */
    gruposVisiveis = computed(() => {
        const lista = this.detalhes();
        if (!this.soDiferencas()) return this.grupos();
        return this.grupos()
            .map((g) => ({ ...g, linhas: g.linhas.filter((l) => new Set(lista.map((i) => JSON.stringify(l.valor(i)))).size > 1) }))
            .filter((g) => g.linhas.length > 0);
    });

    private todasLinhas = computed(() => this.grupos().flatMap((g) => g.linhas));

    /** Quantas linhas "com melhor" cada imóvel vence. */
    vitorias = computed(() => {
        const mapa = new Map<number, number>();
        for (const l of this.todasLinhas()) {
            for (const i of this.detalhes()) {
                if (this.ehMelhor(l, i)) mapa.set(i.id, (mapa.get(i.id) ?? 0) + 1);
            }
        }
        return mapa;
    });
    linhasComparaveis = computed(() => this.todasLinhas().filter((l) => this.vencedoresDa(l).length > 0).length);
    /** Imóvel que vence mais itens (sem empate). */
    vencedor = computed(() => {
        const ordem = [...this.vitorias()].sort((a, b) => b[1] - a[1]);
        return ordem.length && (ordem.length === 1 || ordem[0][1] > ordem[1][1]) ? ordem[0][0] : null;
    });

    caracteristicas = computed(() => [...new Set(this.detalhes().flatMap((i) => i.caracteristicas))].sort((a, b) => a.localeCompare(b, 'pt-BR')));

    pontos = computed<PontoMapa[]>(() =>
        this.detalhes()
            .filter((i) => i.latitude != null && i.longitude != null)
            .map((i) => ({ id: i.id, lat: i.latitude!, lng: i.longitude!, titulo: `${i.codigo} · ${i.tipoDescricao}`, subtitulo: `${i.bairro}, ${i.cidade}`, preco: moeda.format(i.preco), link: `/imovel/${i.id}/${slug(i.titulo)}` }))
    );

    constructor() {
        inject(ConfigService).definirTitulo('Comparar favoritos');
        this.conta.listarFavoritos().subscribe({
            next: (l) => {
                this.favoritos.set(l);
                this.carregandoFavoritos.set(false);
            },
            error: () => this.carregandoFavoritos.set(false)
        });
        toObservable(this.detalhes).subscribe(() => this.carregandoDetalhes.set(false));
    }

    selecionar(ids: number[]) {
        this.router.navigate([], { queryParams: { ids: ids.length ? ids.slice(0, MAX).join(',') : null }, replaceUrl: true });
    }

    remover(id: number) {
        this.selecionar(this.ids().filter((x) => x !== id));
    }

    /** Imóveis com o melhor valor da linha (vazio se a linha não tem "melhor", falta valor para comparar ou todos empatam). */
    private vencedoresDa(l: Linha): number[] {
        if (!l.melhor) return [];
        const valores = this.detalhes()
            .map((i) => ({ id: i.id, v: l.valor(i) }))
            .filter((x): x is { id: number; v: number } => typeof x.v === 'number');
        if (valores.length < 2 || new Set(valores.map((x) => x.v)).size === 1) return [];
        const alvo = l.melhor === 'menor' ? Math.min(...valores.map((x) => x.v)) : Math.max(...valores.map((x) => x.v));
        return valores.filter((x) => x.v === alvo).map((x) => x.id);
    }

    ehMelhor(l: Linha, i: ImovelDetalhe): boolean {
        return this.vencedoresDa(l).includes(i.id);
    }

    selosDe(id: number) {
        return SELOS.filter((s) => {
            const l = this.todasLinhas().find((x) => x.id === s.linha);
            return !!l && this.vencedoresDa(l).length === 1 && this.vencedoresDa(l)[0] === id;
        });
    }

    formatar(l: Linha, i: ImovelDetalhe): string {
        const v = l.valor(i);
        if (v == null || v === '') return '—';
        if (l.tipo === 'moeda' && typeof v === 'number') return moeda.format(v);
        if (l.tipo === 'numero' && typeof v === 'number') return v.toLocaleString('pt-BR') + (l.sufixo ?? '');
        return String(v);
    }

    copiarLink() {
        navigator.clipboard?.writeText(location.href).then(
            () => this.msg.add({ severity: 'success', summary: 'Link copiado', detail: 'Quem tiver estes imóveis nos favoritos verá a mesma comparação.' }),
            () => this.msg.add({ severity: 'warn', summary: 'Não foi possível copiar o link' })
        );
    }

    imprimir() {
        window.print();
    }

    slugTexto(t: string) {
        return slug(t);
    }
}
