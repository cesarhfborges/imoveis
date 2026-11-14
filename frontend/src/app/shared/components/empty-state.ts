import { Component, input } from '@angular/core';

/** Mensagem para listas vazias, com espaço para um botão de ação. */
@Component({
    selector: 'app-empty-state',
    template: `
        <div class="flex flex-col items-center text-center gap-3 py-12 px-4">
            <span class="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-400/10 text-primary flex items-center justify-center">
                <i class="pi {{ icone() }} text-2xl!" aria-hidden="true"></i>
            </span>
            <div class="text-lg font-semibold">{{ titulo() }}</div>
            @if (texto()) {
                <p class="text-muted-color m-0 max-w-md">{{ texto() }}</p>
            }
            <ng-content />
        </div>
    `
})
export class EmptyState {
    titulo = input.required<string>();
    texto = input<string | null>(null);
    icone = input('pi-inbox');
}
