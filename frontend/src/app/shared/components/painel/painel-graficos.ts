import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { AreaGestao } from '@/app/core/services/imovel.service';
import { PainelAnuncios } from '@/app/core/models/models';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { CoresGraficoService } from './cores-grafico.service';
import { GraficoCard } from './grafico-card';
import { dadosLinha, dadosPizza, dadosRanking, numero, opcoesBarra, opcoesLinha, opcoesPizza, rotuloDia, semDados, variacao } from './graficos';
import { TabelaResponsiva } from '@/app/shared/directives/tabela-responsiva';

type Regiao = 'cidade' | 'bairro';

/**
 * Cartões de desempenho dos anúncios, comuns ao painel do corretor e ao da administração.
 * O conteúdo muda pelo contexto: o corretor vê só os próprios anúncios; a administração vê o portal inteiro
 * e ganha o ranking por anunciante.
 */
@Component({
    selector: 'app-painel-graficos',
    imports: [FormsModule, RouterLink, SelectButtonModule, TableModule, TabelaResponsiva, StatCard, StatusTag, GraficoCard],
    template: `
        @let p = painel();
        @let r = p.resumo;
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card [titulo]="'Visitas (' + p.dias + ' dias)'" [valor]="fmt(r.visitas)" icone="pi-eye" cor="bg-cyan-100 dark:bg-cyan-400/10 text-cyan-500" [variacao]="varVisitas()" [detalhe]="varVisitas() === null ? fmt(r.visitasAcumuladas) + ' no total' : null" />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card [titulo]="'Contatos (' + p.dias + ' dias)'" [valor]="fmt(r.contatos)" icone="pi-envelope" cor="bg-orange-100 dark:bg-orange-400/10 text-orange-500" [variacao]="varContatos()" [detalhe]="varContatos() === null ? 'Sem base no período anterior' : null" />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card titulo="Taxa de contato" [valor]="taxaContato()" icone="pi-percentage" cor="bg-green-100 dark:bg-green-400/10 text-green-500" detalhe="Contatos a cada 100 visitas" />
            </div>
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <app-stat-card [titulo]="area() === 'admin' ? 'Imóveis favoritados' : 'Seus imóveis favoritados'" [valor]="fmt(r.favoritos)" icone="pi-heart" cor="bg-pink-100 dark:bg-pink-400/10 text-pink-500" [detalhe]="fmt(r.anunciosAtivos) + ' anúncios ativos'" />
            </div>

            <app-grafico-card class="col-span-12 xl:col-span-8" titulo="Visitas e contatos por dia" [subtitulo]="area() === 'admin' ? 'Todo o portal, últimos ' + p.dias + ' dias' : 'Seus anúncios, últimos ' + p.dias + ' dias'" tipo="line" [dados]="visitasDia()" [opcoes]="oLinha()" altura="300px" [vazio]="semDados(p.visitasPorDia) && semDados(p.contatosPorDia)" mensagemVazio="Nenhuma visita registrada no período. O histórico diário começa a contar a partir das próximas visitas." />

            <app-grafico-card class="col-span-12 md:col-span-6 xl:col-span-4" titulo="Visitas por finalidade" subtitulo="Total acumulado" tipo="doughnut" [dados]="porFinalidade()" [opcoes]="oPizza()" altura="300px" [vazio]="semDados(p.visitasPorFinalidade)" />

            <app-grafico-card class="col-span-12 md:col-span-6 xl:col-span-6" titulo="Visitas por região" [subtitulo]="regiao() === 'cidade' ? 'Cidades com mais visitas (acumulado)' : 'Bairros com mais visitas (acumulado)'" tipo="bar" [dados]="porRegiao()" [opcoes]="oBarraH()" altura="300px" [vazio]="semDados(regiao() === 'cidade' ? p.visitasPorCidade : p.visitasPorBairro)">
                <div acoes>
                    <span id="rotulo-regiao" class="sr-only">Agrupar visitas por</span>
                    <p-selectbutton [options]="regioes" optionLabel="label" optionValue="value" [allowEmpty]="false" [ngModel]="regiao()" (ngModelChange)="regiao.set($event)" size="small" ariaLabelledBy="rotulo-regiao" />
                </div>
            </app-grafico-card>

            <app-grafico-card class="col-span-12 md:col-span-6 xl:col-span-6" titulo="Visitas por tipo de imóvel" subtitulo="Total acumulado" tipo="bar" [dados]="porTipo()" [opcoes]="oBarra()" altura="300px" [vazio]="semDados(p.visitasPorTipo)" />

            @if (area() === 'admin') {
                <app-grafico-card class="col-span-12 xl:col-span-8" titulo="Visitas por anunciante" subtitulo="Anunciantes com mais visitas (acumulado)" tipo="bar" [dados]="porAnunciante()" [opcoes]="oBarraH()" altura="300px" [vazio]="semDados(p.visitasPorAnunciante)" />
            }
            <app-grafico-card [class]="area() === 'admin' ? 'col-span-12 md:col-span-6 xl:col-span-4' : 'col-span-12 md:col-span-6'" titulo="Anúncios por finalidade" subtitulo="Quantidade de anúncios" tipo="pie" [dados]="anunciosFinalidade()" [opcoes]="oPizza()" altura="300px" [vazio]="semDados(p.anunciosPorFinalidade)" />
            @if (area() === 'corretor') {
                <app-grafico-card class="col-span-12 md:col-span-6" titulo="Novos anúncios publicados" [subtitulo]="'Últimos ' + p.dias + ' dias'" tipo="bar" [dados]="novosAnuncios()" [opcoes]="oBarra()" altura="300px" [vazio]="semDados(p.anunciosNovosPorDia)" mensagemVazio="Nenhum anúncio novo no período." />
            }

            <div class="col-span-12 card m-0">
                <h2 class="text-lg font-semibold mt-0">{{ area() === 'admin' ? 'Anúncios mais vistos do portal' : 'Seus anúncios mais vistos' }}</h2>
                <p-table appTabelaResponsiva [value]="p.maisVistos" [tableStyle]="{ 'min-width': '44rem' }" size="small">
                    <ng-template #header>
                        <tr>
                            <th scope="col">Anúncio</th>
                            <th scope="col">Local</th>
                            <th scope="col">Situação</th>
                            <th scope="col" class="text-right">Visitas</th>
                            <th scope="col" class="text-right">Contatos</th>
                            <th scope="col" class="text-right">Favoritos</th>
                            <th scope="col" class="text-right">Conversão</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-i>
                        <tr>
                            <td>
                                <a [routerLink]="[base(), 'anuncios', i.id]" class="text-primary font-medium hover:underline">{{ i.titulo }}</a>
                                <div class="text-muted-color text-sm">{{ i.codigo }}</div>
                            </td>
                            <td>{{ i.bairro }} · {{ i.cidade }}</td>
                            <td><app-status-tag [status]="i.status" /></td>
                            <td class="text-right">{{ fmt(i.visualizacoes) }}</td>
                            <td class="text-right">{{ fmt(i.contatos) }}</td>
                            <td class="text-right">{{ fmt(i.favoritos) }}</td>
                            <td class="text-right">{{ conversao(i.contatos, i.visualizacoes) }}</td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="7" class="text-center text-muted-color">Nenhum anúncio ainda.</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>
    `
})
export class PainelGraficos {
    painel = input.required<PainelAnuncios>();
    area = input.required<AreaGestao>();

    private cores = inject(CoresGraficoService).cores;
    regiao = signal<Regiao>('cidade');
    regioes: { label: string; value: Regiao }[] = [
        { label: 'Cidade', value: 'cidade' },
        { label: 'Bairro', value: 'bairro' }
    ];

    readonly fmt = numero;
    varVisitas = computed(() => variacao(this.painel().resumo.visitas, this.painel().resumo.visitasAnterior));
    varContatos = computed(() => variacao(this.painel().resumo.contatos, this.painel().resumo.contatosAnterior));
    readonly semDados = semDados;

    base = computed(() => (this.area() === 'admin' ? '/admin' : '/conta'));
    taxaContato = computed(() => this.conversao(this.painel().resumo.contatos, this.painel().resumo.visitas));

    oLinha = computed(() => opcoesLinha(this.cores()));
    oBarra = computed(() => opcoesBarra(this.cores()));
    oBarraH = computed(() => opcoesBarra(this.cores(), true));
    oPizza = computed(() => opcoesPizza(this.cores()));

    visitasDia = computed(() =>
        dadosLinha(this.cores(), [
            { rotulo: 'Visitas', pontos: this.painel().visitasPorDia },
            { rotulo: 'Contatos', pontos: this.painel().contatosPorDia }
        ])
    );
    porFinalidade = computed(() => dadosPizza(this.cores(), this.painel().visitasPorFinalidade));
    anunciosFinalidade = computed(() => dadosPizza(this.cores(), this.painel().anunciosPorFinalidade));
    porRegiao = computed(() => {
        const p = this.painel();
        return dadosRanking(this.cores(), this.regiao() === 'cidade' ? p.visitasPorCidade : p.visitasPorBairro, 'Visitas');
    });
    porTipo = computed(() => dadosRanking(this.cores(), this.painel().visitasPorTipo, 'Visitas', this.cores().serie[1]));
    porAnunciante = computed(() => dadosRanking(this.cores(), this.painel().visitasPorAnunciante, 'Visitas', this.cores().serie[3]));
    novosAnuncios = computed(() => dadosRanking(this.cores(), this.painel().anunciosNovosPorDia.map((d) => ({ rotulo: rotuloDia(d.dia), total: d.total })), 'Anúncios', this.cores().serie[2]));

    conversao(contatos: number, visitas: number): string {
        return visitas ? ((contatos / visitas) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—';
    }
}
