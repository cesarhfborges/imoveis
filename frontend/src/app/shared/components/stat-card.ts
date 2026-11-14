import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Cartão de número do painel (estilo dos widgets do Sakai). */
@Component({
    selector: 'app-stat-card',
    imports: [RouterLink],
    template: `
        <div class="card mb-0 h-full">
            <div class="flex justify-between mb-4">
                <div>
                    <span class="block text-muted-color font-medium mb-4">{{ titulo() }}</span>
                    <div class="text-surface-900 dark:text-surface-0 font-medium text-2xl">{{ valor() }}</div>
                </div>
                <div class="flex items-center justify-center rounded-border" [class]="cor()" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi {{ icone() }} text-xl!"></i>
                </div>
            </div>
            @if (detalhe()) {
                @if (link()) {
                    <a [routerLink]="link()" class="text-primary font-medium hover:underline">{{ detalhe() }}</a>
                } @else {
                    <span class="text-muted-color">{{ detalhe() }}</span>
                }
            }
        </div>
    `
})
export class StatCard {
    titulo = input.required<string>();
    valor = input<string | number | null>(0);
    icone = input('pi-chart-bar');
    cor = input('bg-blue-100 dark:bg-blue-400/10 text-blue-500');
    detalhe = input<string | null>(null);
    link = input<string | null>(null);
}
