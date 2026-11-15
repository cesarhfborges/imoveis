import { Component, computed, input } from '@angular/core';

/** HTML de uma mensagem/conclusão (limpo no servidor; o Angular ainda sanitiza). Texto simples vira parágrafos. */
export function htmlDeTexto(texto: string | null | undefined): string {
    if (!texto) return '';
    if (texto.trimStart().startsWith('<')) return texto;
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML.replace(/\n/g, '<br>');
}

@Component({
    selector: 'app-texto-rico',
    template: `<span class="texto-rico" [innerHTML]="html()"></span>`,
    styles: `
        .texto-rico {
            display: block;
        }
        .texto-rico ::ng-deep :is(p, ol, ul, blockquote) {
            margin: 0 0 0.4rem;
        }
        .texto-rico ::ng-deep :is(ol, ul) {
            padding-left: 1.4rem;
        }
        .texto-rico ::ng-deep li[data-list='bullet'] {
            list-style-type: disc;
        }
        .texto-rico ::ng-deep a {
            color: var(--p-primary-color);
            text-decoration: underline;
        }
    `
})
export class TextoRicoView {
    texto = input<string | null>(null);
    html = computed(() => htmlDeTexto(this.texto()));
}
