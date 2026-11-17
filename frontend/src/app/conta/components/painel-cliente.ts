import { Component, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ClientePainel, Financeira, ImovelResumo, Usuario } from '@/app/core/models/models';
import { slug } from '@/app/core/pipes/formatos';
import { ConfigService } from '@/app/core/services/config.service';
import { StatCard } from '@/app/shared/components/stat-card';
import { ImovelCardMini } from '@/app/shared/components/imovel-card-mini';
import { CoresGraficoService } from '@/app/shared/components/painel/cores-grafico.service';
import { GraficoCard } from '@/app/shared/components/painel/grafico-card';
import { opcoesBarra } from '@/app/shared/components/painel/graficos';
import { SimulacaoDialog } from '@/app/shared/components/financiamento/simulacao-dialog';
import { motivoInelegivel, parcelaEstimada } from '@/app/shared/components/financiamento/simulacao';

const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

/** Itens do cadastro que contam para o "perfil completo" do cliente. */
const ITENS_PERFIL: { rotulo: string; ok: (u: Usuario) => boolean }[] = [
    { rotulo: 'Nome', ok: (u) => !!u.nome?.trim() },
    { rotulo: 'Telefone', ok: (u) => !!u.telefone },
    { rotulo: 'CPF', ok: (u) => !!u.documento },
    { rotulo: 'Foto', ok: (u) => !!u.fotoUrl },
    { rotulo: 'Endereço', ok: (u) => !!u.cep && !!u.cidade }
];

/** Painel da conta para o perfil cliente: atividade, contatos, recomendações, preços e financiamento. */
@Component({
    selector: 'app-painel-cliente',
    imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, ButtonModule, ProgressBarModule, TagModule, StatCard, ImovelCardMini, GraficoCard, SimulacaoDialog],
    template: `
        @let p = painel();
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card titulo="Favoritos" [valor]="favoritos().length" icone="pi-heart" cor="bg-pink-100 dark:bg-pink-400/10 text-pink-500" detalhe="Ver favoritos" link="/conta/favoritos" />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card titulo="Contatos enviados" [valor]="p.contatosEnviados" icone="pi-send" cor="bg-orange-100 dark:bg-orange-400/10 text-orange-500" [detalhe]="p.contatosEnviados ? p.contatosVistos + ' vistos pelo anunciante' : 'Nenhuma mensagem enviada ainda'" />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card mb-0 h-full">
                    <div class="flex justify-between mb-3">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Perfil completo</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ perfilPct() }}%</div>
                        </div>
                        <div class="flex items-center justify-center rounded-border bg-green-100 dark:bg-green-400/10 text-green-500" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-id-card text-xl!" aria-hidden="true"></i>
                        </div>
                    </div>
                    <p-progressbar [value]="perfilPct()" [showValue]="false" styleClass="h-2 mb-3" ariaLabel="Percentual do perfil preenchido" />
                    @if (faltando().length) {
                        <a routerLink="/conta/perfil" class="text-primary font-medium hover:underline">Completar: {{ faltando().join(', ') }}</a>
                    } @else {
                        <span class="text-muted-color">Tudo preenchido. Obrigado!</span>
                    }
                </div>
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3" [class.hidden]="!alertaPreco()">
                <app-stat-card titulo="Baixaram de preço" [valor]="p.quedasPreco.length" icone="pi-arrow-down" cor="bg-green-100 dark:bg-green-400/10 text-green-500" [detalhe]="p.quedasPreco.length ? 'Ver nos favoritos' : 'Avisamos aqui quando um favorito baixar'" [link]="p.quedasPreco.length ? '/conta/favoritos' : null" />
            </div>

            <app-grafico-card [class]="alertaPreco() ? 'col-span-12 xl:col-span-8' : 'col-span-12'" titulo="Sua atividade" subtitulo="Favoritos salvos e contatos enviados por mês, últimos 12 meses" tipo="bar" [dados]="graficoAtividade()" [opcoes]="opcoesAtividade()" [vazio]="semAtividade()" mensagemVazio="Favorite imóveis e envie mensagens para ver sua atividade aqui." />

            @if (alertaPreco()) {
            <section class="col-span-12 xl:col-span-4 card m-0" aria-labelledby="quedas-titulo">
                <h2 id="quedas-titulo" class="text-lg font-semibold mt-0">Baixaram de preço</h2>
                @for (q of p.quedasPreco.slice(0, 5); track q.imovelId) {
                    <a [routerLink]="['/imovel', q.imovelId, slugTexto(q.titulo)]" class="flex items-center justify-between gap-3 py-2 border-b border-surface last:border-0 hover:bg-emphasis rounded-border px-1">
                        <span class="min-w-0">
                            <span class="block truncate font-medium text-color">{{ q.titulo }}</span>
                            <span class="text-sm text-muted-color"><s>{{ q.precoAnterior | currency: 'BRL' }}</s> → {{ q.precoAtual | currency: 'BRL' }}</span>
                        </span>
                        <p-tag severity="success" [value]="'↓ ' + (q.percentual | number: '1.0-1') + '%'" />
                    </a>
                } @empty {
                    <p class="text-muted-color m-0">Nenhum favorito baixou de preço desde que você salvou. Avisamos aqui e na página de favoritos.</p>
                }
            </section>
            }

            <section [class]="simulacao() ? 'col-span-12 xl:col-span-6 card m-0' : 'col-span-12 card m-0'" aria-labelledby="contatos-titulo">
                <h2 id="contatos-titulo" class="text-lg font-semibold mt-0">Contatos recentes</h2>
                @for (c of p.contatosRecentes; track c.id) {
                    <div class="flex gap-3 py-3 border-b border-surface last:border-0">
                        <div class="min-w-0 grow">
                            <a [routerLink]="['/imovel', c.imovelId, slugTexto(c.imovelTitulo)]" class="font-medium text-primary hover:underline block truncate">{{ c.imovelTitulo }}</a>
                            <div class="text-xs text-muted-color">{{ c.imovelCodigo }} · {{ c.bairro }}, {{ c.cidade }} · {{ c.criadoEm | date: 'dd/MM/yyyy HH:mm' }}</div>
                            <p class="text-sm mt-1 mb-0 line-clamp-2">{{ c.mensagem }}</p>
                        </div>
                        <p-tag class="shrink-0 self-start" [severity]="c.visto ? 'success' : 'secondary'" [value]="c.visto ? 'Visto pelo anunciante' : 'Ainda não visto'" />
                    </div>
                } @empty {
                    <p class="text-muted-color m-0">Você ainda não enviou mensagens. Use "Enviar mensagem" na página de um imóvel.</p>
                }
            </section>

            @if (simulacao()) {
            <section class="col-span-12 xl:col-span-6 card m-0" aria-labelledby="financ-titulo">
                <h2 id="financ-titulo" class="text-lg font-semibold mt-0">Resumo de financiamento</h2>
                <p class="text-sm text-muted-color mt-0">Seus favoritos à venda que aceitam financiamento, com a menor parcela estimada (entrada mínima e prazo máximo).</p>
                @for (f of financiaveis(); track f.imovel.id) {
                    <div class="flex items-center justify-between gap-3 py-3 border-b border-surface last:border-0">
                        <div class="min-w-0">
                            <a [routerLink]="['/imovel', f.imovel.id, slugTexto(f.imovel.titulo)]" class="font-medium text-primary hover:underline block truncate">{{ f.imovel.titulo }}</a>
                            <div class="text-sm text-muted-color">
                                {{ f.imovel.preco | currency: 'BRL' }}
                                @if (f.melhor; as m) {
                                    · a partir de <strong class="text-color">{{ m.parcela | currency: 'BRL' }}/mês</strong> com {{ m.nome }}
                                } @else {
                                    · fora da faixa das financeiras
                                }
                            </div>
                        </div>
                        <p-button label="Simular" icon="pi pi-calculator" size="small" [outlined]="true" (onClick)="simulando.set(f.imovel); financeirasSimulacao.set(f.financeiras)" [ariaLabel]="'Simular financiamento de ' + f.imovel.titulo" />
                    </div>
                } @empty {
                    <p class="text-muted-color m-0">Nenhum favorito à venda com financiamento disponível. Favorite imóveis com o selo "Financia" para simular aqui.</p>
                }
            </section>
            }

            <section class="col-span-12 card m-0" aria-labelledby="recomendados-titulo">
                <h2 id="recomendados-titulo" class="text-lg font-semibold mt-0">Recomendados para você</h2>
                @if (p.recomendados.length) {
                    <p class="text-sm text-muted-color mt-0">Com base nos imóveis que você favoritou e visitou.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        @for (i of p.recomendados; track i.id) {
                            <app-imovel-card-mini [imovel]="i" />
                        }
                    </div>
                } @else {
                    <p class="text-muted-color m-0">Favorite ou visite alguns imóveis para receber recomendações.</p>
                }
            </section>

            <section class="col-span-12 card m-0" aria-labelledby="novidades-titulo">
                <h2 id="novidades-titulo" class="text-lg font-semibold mt-0">Novidades na sua região</h2>
                @if (p.novidades.bairros.length) {
                    <p class="text-sm text-muted-color mt-0">Anúncios publicados nos últimos 7 dias em {{ p.novidades.bairros.join(', ') }}.</p>
                    @if (p.novidades.imoveis.length) {
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            @for (i of p.novidades.imoveis; track i.id) {
                                <app-imovel-card-mini [imovel]="i" />
                            }
                        </div>
                    } @else {
                        <p class="text-muted-color m-0">Nada novo nesses bairros esta semana.</p>
                    }
                } @else {
                    <p class="text-muted-color m-0">Favorite imóveis para acompanhar as novidades dos bairros que você mais gosta.</p>
                }
            </section>

            @if (p.vistosRecentes.length) {
                <section class="col-span-12 card m-0" aria-labelledby="vistos-titulo">
                    <h2 id="vistos-titulo" class="text-lg font-semibold mt-0">Vistos recentemente</h2>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        @for (i of p.vistosRecentes; track i.id) {
                            <app-imovel-card-mini [imovel]="i" />
                        }
                    </div>
                </section>
            }

            <section class="col-span-12 card m-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4" aria-labelledby="comparar-titulo">
                <div>
                    <h2 id="comparar-titulo" class="text-lg font-semibold m-0">Comparar favoritos</h2>
                    <p class="text-muted-color mt-1 mb-0">Coloque até 4 favoritos lado a lado: preço do m², custo por mês, espaço, documentação, itens e mapa.</p>
                </div>
                <p-button label="Abrir comparação" icon="pi pi-clone" routerLink="/conta/comparar" [disabled]="favoritos().length < 2" styleClass="shrink-0" />
            </section>
        </div>

        @if (simulando(); as s) {
            <app-simulacao-dialog [visivel]="!!simulando()" (visivelChange)="!$event && simulando.set(null)" [titulo]="s.titulo" [preco]="s.preco" [financeiras]="financeirasSimulacao()" />
        }
    `
})
export class PainelCliente {
    painel = input.required<ClientePainel>();
    usuario = input<Usuario | null>(null);
    favoritos = input<ImovelResumo[]>([]);

    private cores = inject(CoresGraficoService).cores;
    private config = inject(ConfigService).config;
    /** Regras da aba Regras em /admin/configuracoes. */
    simulacao = computed(() => this.config().simulacaoFinanciamento !== false);
    alertaPreco = computed(() => this.config().alertaQuedaPreco !== false);
    simulando = signal<ImovelResumo | null>(null);
    financeirasSimulacao = signal<Financeira[]>([]);

    perfilPct = computed(() => {
        const u = this.usuario();
        if (!u) return 0;
        return Math.round((ITENS_PERFIL.filter((i) => i.ok(u)).length / ITENS_PERFIL.length) * 100);
    });
    faltando = computed(() => {
        const u = this.usuario();
        return u ? ITENS_PERFIL.filter((i) => !i.ok(u)).map((i) => i.rotulo.toLowerCase()) : [];
    });

    semAtividade = computed(() => !this.painel().atividade.some((a) => a.favoritos || a.contatos));
    opcoesAtividade = computed(() => opcoesBarra(this.cores(), false, true));
    graficoAtividade = computed(() => {
        const a = this.painel().atividade;
        const c = this.cores();
        return {
            labels: a.map((m) => {
                const [ano, mes] = m.mes.split('-').map(Number);
                return fmtMes.format(new Date(ano, mes - 1, 1));
            }),
            datasets: [
                { label: 'Favoritos', data: a.map((m) => m.favoritos), backgroundColor: c.serie[4], borderRadius: 4, maxBarThickness: 18 },
                { label: 'Contatos', data: a.map((m) => m.contatos), backgroundColor: c.primaria, borderRadius: 4, maxBarThickness: 18 }
            ]
        };
    });

    /** Melhor parcela estimada de cada favorito financiável (entre as financeiras em que o preço se enquadra). */
    financiaveis = computed(() =>
        this.painel().financiamentos.map((f) => {
            const opcoes = f.financeiras.filter((x) => !motivoInelegivel(x, f.imovel.preco)).map((x) => ({ nome: x.nome, parcela: parcelaEstimada(x, f.imovel.preco) }));
            const melhor = opcoes.length ? opcoes.reduce((a, b) => (b.parcela < a.parcela ? b : a)) : null;
            return { ...f, melhor };
        })
    );

    slugTexto(t: string) {
        return slug(t);
    }
}
