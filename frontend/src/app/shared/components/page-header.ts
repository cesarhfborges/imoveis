import { Component, input } from '@angular/core';

/** Cabeçalho das páginas internas (conta e admin): título, subtítulo e ações à direita. */
@Component({
    selector: 'app-page-header',
    template: `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
                <h1 class="text-2xl font-semibold m-0">{{ titulo() }}</h1>
                @if (subtitulo()) {
                    <p class="text-muted-color mt-1 mb-0">{{ subtitulo() }}</p>
                }
            </div>
            <div class="flex flex-wrap gap-2"><ng-content /></div>
        </div>
    `
})
export class PageHeader {
    titulo = input.required<string>();
    subtitulo = input<string | null>(null);
}
