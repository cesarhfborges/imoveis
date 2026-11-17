import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { PeriodoPainel, RelatorioAnuncio } from '@/app/core/models/models';
import { AreaGestao, GestaoAnunciosService } from '@/app/core/services/imovel.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { EmptyState } from '@/app/shared/components/empty-state';
import { GraficoCard } from '@/app/shared/components/painel/grafico-card';
import { PeriodoSelect } from '@/app/shared/components/painel/periodo-select';
import { CoresGraficoService } from '@/app/shared/components/painel/cores-grafico.service';
import { dadosLinha, numero, opcoesLinha, semDados, variacao } from '@/app/shared/components/painel/graficos';

/** Relatório de um anúncio: visitas, contatos e favoritos no período, comparação com os outros anúncios e preço. */
@Component({
    selector: 'app-relatorio-anuncio-page',
    imports: [CurrencyPipe, DatePipe, RouterLink, SkeletonModule, TableModule, PageHeader, StatCard, EmptyState, GraficoCard, PeriodoSelect],
    template: `
        <app-page-header titulo="Relatório do anúncio" [subtitulo]="r() ? r()!.anuncio.codigo + ' · ' + r()!.anuncio.titulo : 'Visitas, contatos e favoritos'">
            <app-periodo-select [(periodo)]="periodo" />
        </app-page-header>
        <a [routerLink]="base" class="inline-flex items-center gap-1 text-primary font-medium hover:underline mb-4"><i class="pi pi-arrow-left" aria-hidden="true"></i> Voltar aos anúncios</a>

        @if (erro()) {
            <div class="card"><app-empty-state titulo="Relatório indisponível" [texto]="erro()!" icone="pi-chart-line" /></div>
        } @else if (r(); as r) {
            <div class="grid grid-cols-12 gap-4">
                <app-stat-card class="col-span-12 sm:col-span-6 xl:col-span-3" titulo="Visitas" [valor]="fmt(r.resumo.visitas)" icone="pi-eye" cor="bg-blue-100 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400" [variacao]="varVisitas()" />
                <app-stat-card
                    class="col-span-12 sm:col-span-6 xl:col-span-3"
                    titulo="Contatos"
                    [valor]="fmt(r.resumo.contatos)"
                    icone="pi-envelope"
                    cor="bg-orange-100 dark:bg-orange-400/10 text-orange-600 dark:text-orange-400"
                    [variacao]="varContatos()"
                />
                <app-stat-card
                    class="col-span-12 sm:col-span-6 xl:col-span-3"
                    titulo="Novos favoritos"
                    [valor]="fmt(r.resumo.favoritos)"
                    icone="pi-heart"
                    cor="bg-pink-100 dark:bg-pink-400/10 text-pink-600 dark:text-pink-400"
                    [variacao]="varFavoritos()"
                />
                <app-stat-card
                    class="col-span-12 sm:col-span-6 xl:col-span-3"
                    titulo="Taxa de contato"
                    [valor]="taxa(r.resumo.contatos, r.resumo.visitas)"
                    icone="pi-percentage"
                    cor="bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400"
                    detalhe="Contatos a cada 100 visitas"
                />

                <app-grafico-card
                    class="col-span-12 xl:col-span-8"
                    titulo="Por dia"
                    [subtitulo]="'Últimos ' + r.periodo + ' dias'"
                    tipo="line"
                    [dados]="linhas()"
                    [opcoes]="oLinha()"
                    altura="300px"
                    [vazio]="semDados(r.visitasPorDia) && semDados(r.contatosPorDia) && semDados(r.favoritosPorDia)"
                    mensagemVazio="Nenhuma visita, contato ou favorito neste período."
                />

                <section class="col-span-12 xl:col-span-4 card m-0 flex flex-col gap-4" aria-labelledby="rel-comparacao">
                    <h2 id="rel-comparacao" class="text-lg font-semibold m-0">{{ admin ? 'Comparado aos outros anúncios do anunciante' : 'Comparado aos seus outros anúncios' }}</h2>
                    @if (r.comparacao; as c) {
                        @for (item of comparacoes(); track item.rotulo) {
                            <div class="flex flex-col gap-1">
                                <div class="flex items-baseline justify-between gap-2">
                                    <span class="font-medium">{{ item.rotulo }}</span>
                                    <span class="text-sm" [class]="item.classe">{{ item.texto }}</span>
                                </div>
                                <span class="text-sm text-muted-color">Este anúncio: {{ fmt(item.valor) }} · média dos outros: {{ fmtMedia(item.media) }}</span>
                            </div>
                        }
                        <small class="text-muted-color">Média de {{ c.anuncios }} {{ c.anuncios === 1 ? 'anúncio ativo' : 'anúncios ativos' }} no mesmo período.</small>
                    } @else {
                        <p class="text-muted-color m-0">Não há outros anúncios ativos para comparar.</p>
                    }
                </section>

                <section class="col-span-12 lg:col-span-5 card m-0" aria-labelledby="rel-anuncio">
                    <h2 id="rel-anuncio" class="text-lg font-semibold mt-0 mb-3">O anúncio</h2>
                    <dl class="grid grid-cols-2 gap-x-4 gap-y-3 m-0">
                        <dt class="text-muted-color">No ar desde</dt>
                        <dd class="m-0 font-medium">{{ r.anuncio.criadoEm | date: 'dd/MM/yyyy' }} ({{ r.anuncio.diasNoAr === 1 ? '1 dia' : r.anuncio.diasNoAr + ' dias' }})</dd>
                        <dt class="text-muted-color">Visualizações desde o início</dt>
                        <dd class="m-0 font-medium">{{ fmt(r.anuncio.visualizacoesTotal) }}</dd>
                        <dt class="text-muted-color">Favoritado por</dt>
                        <dd class="m-0 font-medium">{{ r.anuncio.favoritosAtuais === 1 ? '1 pessoa' : fmt(r.anuncio.favoritosAtuais) + ' pessoas' }}</dd>
                        <dt class="text-muted-color">Preço atual</dt>
                        <dd class="m-0 font-medium">{{ r.anuncio.preco | currency: 'BRL' }}</dd>
                    </dl>
                    <a [routerLink]="base + '/' + r.anuncio.id" class="inline-flex items-center gap-1 text-primary font-medium hover:underline mt-4"><i class="pi pi-pencil" aria-hidden="true"></i> Editar anúncio</a>
                </section>

                <section class="col-span-12 lg:col-span-7 card m-0" aria-labelledby="rel-precos">
                    <h2 id="rel-precos" class="text-lg font-semibold mt-0 mb-3">Histórico de preço</h2>
                    @if (r.precos.length) {
                        <p-table [value]="r.precos" size="small" [tableStyle]="{ 'min-width': '28rem' }">
                            <ng-template #header>
                                <tr>
                                    <th scope="col">Data</th>
                                    <th scope="col">De</th>
                                    <th scope="col">Para</th>
                                    <th scope="col">Variação</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-p>
                                <tr>
                                    <td>{{ p.em | date: 'dd/MM/yyyy' }}</td>
                                    <td>{{ p.anterior | currency: 'BRL' }}</td>
                                    <td>{{ p.novo | currency: 'BRL' }}</td>
                                    <td [class]="p.novo < p.anterior ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'">{{ percentual(p.anterior, p.novo) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    } @else {
                        <p class="text-muted-color m-0">O preço não mudou desde que o anúncio foi publicado.</p>
                    }
                </section>
            </div>
        } @else {
            <div class="grid grid-cols-12 gap-4">
                @for (i of [1, 2, 3, 4]; track i) {
                    <p-skeleton class="col-span-12 sm:col-span-6 xl:col-span-3" height="110px" />
                }
                <p-skeleton class="col-span-12" height="300px" />
            </div>
        }
    `
})
export class RelatorioAnuncioPage {
    private route = inject(ActivatedRoute);
    private gestao = inject(GestaoAnunciosService);
    private msg = inject(MessageService);
    private cores = inject(CoresGraficoService).cores;

    area: AreaGestao = this.route.snapshot.data['area'];
    admin = this.area === 'admin';
    base = this.admin ? '/admin/anuncios' : '/conta/anuncios';
    private id = Number(this.route.snapshot.paramMap.get('id'));

    periodo = signal<PeriodoPainel>(30);
    r = signal<RelatorioAnuncio | null>(null);
    erro = signal<string | null>(null);

    readonly fmt = numero;
    readonly semDados = semDados;
    varVisitas = computed(() => this.var('visitas'));
    varContatos = computed(() => this.var('contatos'));
    varFavoritos = computed(() => this.var('favoritos'));
    oLinha = computed(() => opcoesLinha(this.cores()));
    linhas = computed(() => {
        const r = this.r();
        return r
            ? dadosLinha(this.cores(), [
                  { rotulo: 'Visitas', pontos: r.visitasPorDia },
                  { rotulo: 'Contatos', pontos: r.contatosPorDia },
                  { rotulo: 'Favoritos', pontos: r.favoritosPorDia }
              ])
            : null;
    });
    /** Este anúncio x média dos outros, com o texto "N% acima/abaixo da média". */
    comparacoes = computed(() => {
        const r = this.r();
        if (!r?.comparacao) return [];
        return [
            { rotulo: 'Visitas', valor: r.resumo.visitas, media: r.comparacao.mediaVisitas },
            { rotulo: 'Contatos', valor: r.resumo.contatos, media: r.comparacao.mediaContatos }
        ].map((c) => ({ ...c, ...RelatorioAnuncioPage.frente(c.valor, c.media) }));
    });

    constructor() {
        inject(ConfigService).definirTitulo('Relatório do anúncio');
        effect(() => {
            const dias = this.periodo();
            untracked(() => this.carregar(dias));
        });
    }

    private carregar(dias: PeriodoPainel) {
        this.gestao.relatorio(this.area, this.id, dias).subscribe({
            next: (r) => {
                this.r.set(r);
                this.erro.set(null);
            },
            error: (e) => {
                this.erro.set(mensagemErro(e));
                this.msg.add({ severity: 'error', summary: 'Relatório do anúncio', detail: mensagemErro(e) });
            }
        });
    }

    private var(campo: 'visitas' | 'contatos' | 'favoritos'): number | null {
        const r = this.r()?.resumo;
        if (!r) return null;
        const anterior = { visitas: r.visitasAnterior, contatos: r.contatosAnterior, favoritos: r.favoritosAnterior }[campo];
        return variacao(r[campo], anterior);
    }

    taxa(contatos: number, visitas: number): string {
        return visitas ? `${((contatos / visitas) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—';
    }

    fmtMedia(n: number): string {
        return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    }

    percentual(de: number, para: number): string {
        if (!de) return '—';
        const p = ((para - de) / de) * 100;
        return `${p > 0 ? '+' : ''}${p.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    }

    /**
     * Texto da comparação com a média. Diferença menor que 0,5 conta como "na média" (contagens inteiras contra
     * médias fracionadas, ex.: 0 contatos x média 0,007); de 2x em diante, "N× a média" no lugar de "+7895%".
     */
    static frente(valor: number, media: number): { texto: string; classe: string } {
        const acima = 'text-green-700 dark:text-green-400';
        const abaixo = 'text-orange-700 dark:text-orange-400';
        if (Math.abs(valor - media) < 0.5) return { texto: 'na média', classe: 'text-muted-color' };
        if (media < 0.5) return { texto: 'acima da média', classe: acima };
        if (valor >= media * 2) return { texto: `${(valor / media).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}× a média`, classe: acima };
        const p = Math.round(((valor - media) / media) * 100);
        return p > 0 ? { texto: `${p}% acima da média`, classe: acima } : { texto: `${-p}% abaixo da média`, classe: abaixo };
    }
}
