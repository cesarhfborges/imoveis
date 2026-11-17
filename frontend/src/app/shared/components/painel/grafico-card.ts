import { Component, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';

/** Cartão do painel com título, subtítulo e um gráfico Chart.js (ou aviso quando não há dados). */
@Component({
    selector: 'app-grafico-card',
    imports: [ChartModule],
    host: { class: 'card m-0 h-full flex flex-col' },
    template: `
        <div class="flex items-start justify-between gap-3 mb-4">
            <div>
                <h2 class="text-lg font-semibold m-0">{{ titulo() }}</h2>
                @if (subtitulo()) {
                    <p class="text-muted-color text-sm mt-1 mb-0">{{ subtitulo() }}</p>
                }
            </div>
            <ng-content select="[acoes]" />
        </div>
        @if (vazio()) {
            <div class="flex flex-col items-center justify-center text-center text-muted-color grow gap-2" [style.min-height]="altura()">
                <i class="pi pi-chart-line text-3xl!" aria-hidden="true"></i>
                <span>{{ mensagemVazio() }}</span>
            </div>
        } @else {
            <p-chart [type]="tipo()" [data]="dados()" [options]="opcoes()" [height]="altura()" [ariaLabel]="titulo() + (subtitulo() ? '. ' + subtitulo() : '')" />
        }
    `
})
export class GraficoCard {
    titulo = input.required<string>();
    subtitulo = input<string | null>(null);
    tipo = input.required<'bar' | 'line' | 'doughnut' | 'pie' | 'polarArea'>();
    dados = input<unknown>();
    opcoes = input<unknown>();
    altura = input('280px');
    vazio = input(false);
    mensagemVazio = input('Ainda não há dados para este período.');
}
